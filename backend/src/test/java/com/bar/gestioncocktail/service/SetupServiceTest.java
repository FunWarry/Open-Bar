package com.bar.gestioncocktail.service;

import com.bar.gestioncocktail.dto.CreateAdminRequestDTO;
import com.bar.gestioncocktail.dto.SetupStatusDTO;
import com.bar.gestioncocktail.dto.UserResponseDTO;
import com.bar.gestioncocktail.exception.BusinessException;
import com.bar.gestioncocktail.model.User;
import com.bar.gestioncocktail.model.UserRole;
import com.bar.gestioncocktail.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SetupServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private SetupService setupService;

    private CreateAdminRequestDTO validRequest;

    @BeforeEach
    void setUp() {
        validRequest = new CreateAdminRequestDTO("superadmin", "admin@bar.com", "Secret123!", "Admin", "Super");
    }

    @Test
    void getSetupStatus_baseVide_renvoieFalseEtCount0() {
        when(userRepository.count()).thenReturn(0L);

        SetupStatusDTO status = setupService.getSetupStatus();

        assertThat(status.initialized()).isFalse();
        assertThat(status.userCount()).isEqualTo(0L);
    }

    @Test
    void getSetupStatus_baseContientUsers_renvoieTrueEtCountPositif() {
        when(userRepository.count()).thenReturn(5L);

        SetupStatusDTO status = setupService.getSetupStatus();

        assertThat(status.initialized()).isTrue();
        assertThat(status.userCount()).isEqualTo(5L);
    }

    @Test
    void createInitialAdmin_baseVide_creeAdminAvecSucces() {
        when(userRepository.count()).thenReturn(0L);
        when(userRepository.existsByUsername(validRequest.username())).thenReturn(false);
        when(userRepository.existsByEmail(validRequest.email())).thenReturn(false);
        when(passwordEncoder.encode(validRequest.password())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(1L);
            return u;
        });

        UserResponseDTO result = setupService.createInitialAdmin(validRequest);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());

        User saved = captor.getValue();
        assertThat(saved.getUsername()).isEqualTo("superadmin");
        assertThat(saved.getEmail()).isEqualTo("admin@bar.com");
        assertThat(saved.getPassword()).isEqualTo("encodedPassword");
        assertThat(saved.getRoles()).containsExactly(UserRole.ADMIN);

        assertThat(result.username()).isEqualTo("superadmin");
        assertThat(result.email()).isEqualTo("admin@bar.com");
    }

    @Test
    void createInitialAdmin_baseNonVide_leveBusinessException() {
        when(userRepository.count()).thenReturn(1L);

        assertThatThrownBy(() -> setupService.createInitialAdmin(validRequest))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("déjà initialisée");

        verify(userRepository, never()).save(any());
    }

    @Test
    void createInitialAdmin_usernameExistant_leveBusinessException() {
        when(userRepository.count()).thenReturn(0L);
        when(userRepository.existsByUsername(validRequest.username())).thenReturn(true);

        assertThatThrownBy(() -> setupService.createInitialAdmin(validRequest))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("déjà pris");

        verify(userRepository, never()).save(any());
    }

    @Test
    void createInitialAdmin_emailExistant_leveBusinessException() {
        when(userRepository.count()).thenReturn(0L);
        when(userRepository.existsByUsername(validRequest.username())).thenReturn(false);
        when(userRepository.existsByEmail(validRequest.email())).thenReturn(true);

        assertThatThrownBy(() -> setupService.createInitialAdmin(validRequest))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("déjà utilisée");

        verify(userRepository, never()).save(any());
    }
}
