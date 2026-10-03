package com.bar.gestioncocktail.integration;

import com.bar.gestioncocktail.dto.ReservationCreateRequest;
import com.bar.gestioncocktail.dto.ReservationUpdateRequest;
import com.bar.gestioncocktail.model.EstablishmentConfig;
import com.bar.gestioncocktail.model.ReservationStatut;
import com.bar.gestioncocktail.model.TableEntity;
import com.bar.gestioncocktail.repository.EstablishmentConfigRepository;
import com.bar.gestioncocktail.repository.ReservationRepository;
import com.bar.gestioncocktail.repository.TableRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end integration tests for advance table reservation lifecycle, conflict resolution,
 * floor plan table seating, and role-based access control.
 */
class ReservationIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TableRepository tableRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private EstablishmentConfigRepository establishmentConfigRepository;

    private Long testTableId;
    private final LocalDate targetDate = LocalDate.now().plusDays(1);

    @BeforeEach
    void setUpTestData() {
        // Ensure table reservations module is enabled
        EstablishmentConfig config = establishmentConfigRepository.findById(EstablishmentConfig.SINGLETON_ID).orElseGet(() -> {
            EstablishmentConfig c = new EstablishmentConfig();
            c.setLegalName("OpenBar Test");
            return c;
        });
        config.setModuleTableReservationsEnabled(true);
        establishmentConfigRepository.save(config);

        // Clean existing test reservations
        reservationRepository.deleteAll();

        // Create or find a test table
        TableEntity table = tableRepository.findByNumero(99).orElseGet(() -> {
            TableEntity t = new TableEntity();
            t.setNumero(99);
            t.setZone("VIP Lounge");
            t.setCapacite(4);
            t.setOccupee(false);
            return tableRepository.save(t);
        });
        table.setOccupee(false);
        this.testTableId = tableRepository.save(table).getId();
    }

    @Test
    @DisplayName("createReservation_nominal_success")
    void createReservation_nominal_success() throws Exception {
        ReservationCreateRequest request = new ReservationCreateRequest(
                "Alice Dupont",
                "+33612345678",
                "alice@example.com",
                targetDate,
                LocalTime.of(19, 30),
                90,
                3,
                "Window seat requested",
                ReservationStatut.CONFIRMED,
                testTableId
        );

        mockMvc.perform(post("/api/reservations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.nomClient").value("Alice Dupont"))
                .andExpect(jsonPath("$.nombrePersonnes").value(3))
                .andExpect(jsonPath("$.statut").value("CONFIRMED"))
                .andExpect(jsonPath("$.tableId").value(testTableId))
                .andExpect(jsonPath("$.tableNumero").value(99));

        assertThat(reservationRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("createReservation_overlapConflict_returns400")
    void createReservation_overlapConflict_returns400() throws Exception {
        // 1. Create first booking: 19:30 to 21:00 on testTable
        ReservationCreateRequest first = new ReservationCreateRequest(
                "Bob Martin",
                "+33698765432",
                "bob@example.com",
                targetDate,
                LocalTime.of(19, 30),
                90,
                2,
                null,
                ReservationStatut.CONFIRMED,
                testTableId
        );

        mockMvc.perform(post("/api/reservations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(first)))
                .andExpect(status().isCreated());

        // 2. Attempt overlapping booking on same table: 20:00 to 21:30 -> Should be rejected with 400
        ReservationCreateRequest overlapping = new ReservationCreateRequest(
                "Charlie Durand",
                "+33611223344",
                "charlie@example.com",
                targetDate,
                LocalTime.of(20, 0),
                90,
                2,
                null,
                ReservationStatut.CONFIRMED,
                testTableId
        );

        mockMvc.perform(post("/api/reservations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(overlapping)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isString());
    }

    @Test
    @DisplayName("checkAvailability_detectsConflictAndCapacity")
    void checkAvailability_detectsConflictAndCapacity() throws Exception {
        // 1. Initial check: table 99 (capacity 4) should be available for party of 2
        mockMvc.perform(get("/api/reservations/check-availability")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .param("tableId", testTableId.toString())
                        .param("date", targetDate.toString())
                        .param("heure", "19:30")
                        .param("dureeMinutes", "90")
                        .param("nombrePersonnes", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disponible").value(true))
                .andExpect(jsonPath("$.capaciteSuffisante").value(true));

        // 2. Create reservation
        ReservationCreateRequest booking = new ReservationCreateRequest(
                "David Bowie",
                "+33600000000",
                "david@example.com",
                targetDate,
                LocalTime.of(19, 30),
                90,
                2,
                null,
                ReservationStatut.CONFIRMED,
                testTableId
        );
        mockMvc.perform(post("/api/reservations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(booking)))
                .andExpect(status().isCreated());

        // 3. Second check: table 99 is now occupied during that slot
        mockMvc.perform(get("/api/reservations/check-availability")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .param("tableId", testTableId.toString())
                        .param("date", targetDate.toString())
                        .param("heure", "20:00")
                        .param("dureeMinutes", "90")
                        .param("nombrePersonnes", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disponible").value(false))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    @DisplayName("seatReservation_transitionsStatusAndOccupiesTable")
    void seatReservation_transitionsStatusAndOccupiesTable() throws Exception {
        // 1. Create confirmed reservation
        ReservationCreateRequest booking = new ReservationCreateRequest(
                "Eva Green",
                "+33644556677",
                "eva@example.com",
                targetDate,
                LocalTime.of(19, 0),
                90,
                4,
                null,
                ReservationStatut.CONFIRMED,
                testTableId
        );

        String responseJson = mockMvc.perform(post("/api/reservations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(booking)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        Long reservationId = objectMapper.readTree(responseJson).get("id").asLong();

        // 2. Seat guests via POST /api/reservations/{id}/seat
        mockMvc.perform(post("/api/reservations/" + reservationId + "/seat")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statut").value("SEATED"));

        // 3. Verify table is now marked occupied
        TableEntity updatedTable = tableRepository.findById(testTableId).orElseThrow();
        assertThat(updatedTable.isOccupee()).isTrue();
    }

    @Test
    @DisplayName("updateStatut_lifecycleTransitions")
    void updateStatut_lifecycleTransitions() throws Exception {
        ReservationCreateRequest booking = new ReservationCreateRequest(
                "Frank Sinatra",
                "+33699887766",
                "frank@example.com",
                targetDate,
                LocalTime.of(21, 0),
                60,
                2,
                null,
                ReservationStatut.PENDING,
                testTableId
        );

        String responseJson = mockMvc.perform(post("/api/reservations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(booking)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        Long reservationId = objectMapper.readTree(responseJson).get("id").asLong();

        // Transition from PENDING to CONFIRMED
        mockMvc.perform(patch("/api/reservations/" + reservationId + "/statut")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .param("statut", "CONFIRMED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statut").value("CONFIRMED"));

        // Transition to CANCELLED
        mockMvc.perform(patch("/api/reservations/" + reservationId + "/statut")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .param("statut", "CANCELLED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statut").value("CANCELLED"));
    }

    @Test
    @DisplayName("security_unauthenticated_returns401")
    void security_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/reservations"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("deleteReservation_accessControl_serveurForbidden_managerAllowed")
    void deleteReservation_accessControl_serveurForbidden_managerAllowed() throws Exception {
        ReservationCreateRequest booking = new ReservationCreateRequest(
                "Grace Hopper",
                "+33611112222",
                "grace@example.com",
                targetDate,
                LocalTime.of(18, 0),
                60,
                1,
                null,
                ReservationStatut.CONFIRMED,
                null
        );

        String responseJson = mockMvc.perform(post("/api/reservations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(booking)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        Long reservationId = objectMapper.readTree(responseJson).get("id").asLong();

        // SERVEUR cannot delete reservations (requires ADMIN or MANAGER) -> 403 Forbidden
        mockMvc.perform(delete("/api/reservations/" + reservationId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken()))
                .andExpect(status().isForbidden());

        // MANAGER can delete reservations -> 204 No Content
        mockMvc.perform(delete("/api/reservations/" + reservationId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getManagerToken()))
                .andExpect(status().isNoContent());

        assertThat(reservationRepository.findById(reservationId)).isEmpty();
    }

    @Test
    @DisplayName("updateReservation_nominal_success")
    void updateReservation_nominal_success() throws Exception {
        ReservationCreateRequest booking = new ReservationCreateRequest(
                "Helen Mirren",
                "+33622334455",
                "helen@example.com",
                targetDate,
                LocalTime.of(18, 30),
                60,
                2,
                null,
                ReservationStatut.CONFIRMED,
                testTableId
        );

        String responseJson = mockMvc.perform(post("/api/reservations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(booking)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        Long reservationId = objectMapper.readTree(responseJson).get("id").asLong();

        ReservationUpdateRequest updateRequest = new ReservationUpdateRequest(
                "Helen Mirren",
                "+33622334455",
                "helen.updated@example.com",
                targetDate,
                LocalTime.of(18, 30),
                90,
                3,
                "Table near the bar requested",
                ReservationStatut.CONFIRMED,
                testTableId
        );

        mockMvc.perform(put("/api/reservations/" + reservationId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + getServeurToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("helen.updated@example.com"))
                .andExpect(jsonPath("$.nombrePersonnes").value(3))
                .andExpect(jsonPath("$.dureeMinutes").value(90));
    }
}
