package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.PageResponseDTO;
import com.bar.gestioncocktail.dto.UserResponseDTO;
import com.bar.gestioncocktail.exception.ResourceNotFoundException;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.model.UserRole;
import com.bar.gestioncocktail.repository.UserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class UserService implements UserDetailsService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TimeService timeService;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, TimeService timeService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.timeService = timeService;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userRepository.findByUsername(username)
            .map(user -> new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPassword(),
                user.getRoles().stream()
                    .map(role -> new SimpleGrantedAuthority("ROLE_" + role.name()))
                    .toList()
            ))
            .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé: " + username));
    }

    public User createUser(User user) {
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setCreatedAt(timeService.now());
        user.setUpdatedAt(timeService.now());
        return userRepository.save(user);
    }

    public User updateUser(Long id, User updatedData) {
        User existing = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé avec l'ID: " + id));

        if (updatedData.getUsername() != null && !updatedData.getUsername().isBlank()) {
            existing.setUsername(updatedData.getUsername());
        }
        if (updatedData.getEmail() != null && !updatedData.getEmail().isBlank()) {
            existing.setEmail(updatedData.getEmail());
        }
        if (updatedData.getNom() != null) {
            existing.setNom(updatedData.getNom());
        }
        if (updatedData.getPrenom() != null) {
            existing.setPrenom(updatedData.getPrenom());
        }
        if (updatedData.getRoles() != null && !updatedData.getRoles().isEmpty()) {
            existing.setRoles(updatedData.getRoles());
        }
        if (updatedData.getPassword() != null && !updatedData.getPassword().isBlank()) {
            existing.setPassword(passwordEncoder.encode(updatedData.getPassword()));
        }
        existing.setUpdatedAt(timeService.now());
        return userRepository.save(existing);
    }

    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }

    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }

    public Optional<User> getUserByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public List<User> getUsersByRole(UserRole role) {
        return userRepository.findByRolesContaining(role);
    }

    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    public void changePassword(User user, String newPassword) {
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(timeService.now());
        userRepository.save(user);
    }

    /**
     * Retrieves all user accounts.
     *
     * @return List of all users
     */
    @Transactional(readOnly = true)
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    /**
     * Returns a paginated list of users filtered by optional search query and role.
     *
     * @param page     Zero-based page index
     * @param size     Number of items per page
     * @param search   Optional search string matched against username, email, nom, prenom
     * @param roleStr  Optional role filter (e.g. "ADMIN", "SERVEUR"). Use "ALL" or blank to disable.
     * @return Paginated response containing {@link UserResponseDTO} items
     */
    @Transactional(readOnly = true)
    public PageResponseDTO<UserResponseDTO> getUsersPaged(int page, int size, String search, String roleStr) {
        List<User> allUsers = userRepository.findAll();

        if (roleStr != null && !roleStr.isBlank() && !"ALL".equalsIgnoreCase(roleStr)) {
            try {
                UserRole role = UserRole.valueOf(roleStr.toUpperCase());
                allUsers = allUsers.stream().filter(u -> u.getRoles().contains(role)).toList();
            } catch (IllegalArgumentException _) {
                // Invalid role value parameter passed, ignore filtering
            }
        }

        if (search != null && !search.isBlank()) {
            String query = search.toLowerCase().trim();
            allUsers = allUsers.stream().filter(u ->
                (u.getUsername() != null && u.getUsername().toLowerCase().contains(query)) ||
                (u.getEmail() != null && u.getEmail().toLowerCase().contains(query)) ||
                (u.getNom() != null && u.getNom().toLowerCase().contains(query)) ||
                (u.getPrenom() != null && u.getPrenom().toLowerCase().contains(query))
            ).toList();
        }

        int totalElements = allUsers.size();
        int fromIndex = Math.min(page * size, totalElements);
        int toIndex = Math.min(fromIndex + size, totalElements);
        List<UserResponseDTO> pagedList = allUsers.subList(fromIndex, toIndex).stream()
            .map(UserResponseDTO::from)
            .toList();

        return PageResponseDTO.of(pagedList, page, size, totalElements);
    }
}