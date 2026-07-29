package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.CreateAdminRequestDTO;
import com.bar.gestioncocktail.dto.SetupStatusDTO;
import com.bar.gestioncocktail.dto.UserResponseDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.model.UserRole;
import com.bar.gestioncocktail.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Service
@Transactional
public class SetupService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TimeService timeService;

    public SetupService(UserRepository userRepository, PasswordEncoder passwordEncoder, TimeService timeService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.timeService = timeService;
    }


    @Transactional(readOnly = true)
    public SetupStatusDTO getSetupStatus() {
        long count = userRepository.count();
        return new SetupStatusDTO(count > 0, count);
    }

    @Transactional
    public UserResponseDTO createInitialAdmin(CreateAdminRequestDTO request) {
        if (userRepository.count() > 0) {
            throw new BusinessException("L'application est déjà initialisée. La création du compte admin initial n'est plus autorisée.");
        }

        if (userRepository.existsByUsername(request.username())) {
            throw new BusinessException("Ce nom d'utilisateur est déjà pris.");
        }

        if (userRepository.existsByEmail(request.email())) {
            throw new BusinessException("Cette adresse email est déjà utilisée.");
        }

        User admin = new User();
        admin.setUsername(request.username());
        admin.setEmail(request.email());
        admin.setPassword(passwordEncoder.encode(request.password()));
        admin.setNom(request.nom() != null ? request.nom() : "Admin");
        admin.setPrenom(request.prenom() != null ? request.prenom() : "Initial");
        admin.setRoles(Set.of(UserRole.ADMIN));
        admin.setCreatedAt(timeService.now());
        admin.setUpdatedAt(timeService.now());

        User savedAdmin = userRepository.save(admin);
        return UserResponseDTO.from(savedAdmin);
    }
}
