package com.bar.gestioncocktail.controller;

import com.bar.gestioncocktail.dto.PlanSalleDTO;
import com.bar.gestioncocktail.dto.TablePositionDTO;
import com.bar.gestioncocktail.dto.TableRequestDTO;
import com.bar.gestioncocktail.dto.TableResponseDTO;
import com.bar.gestioncocktail.service.TableService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for managing bar tables, interactive 2D floor plans (Konva.js),
 * and order transfers between tables.
 */
@RestController
@RequestMapping("/api/tables")
@Tag(name = "Tables & Floor Plan", description = "Table management, occupancy, 2D floor plan layout (Konva.js), and order transfers")
public class TableController {

    private final TableService tableService;

    /**
     * Constructs the controller with the table service dependency.
     *
     * @param tableService Service managing table business logic
     */
    public TableController(TableService tableService) {
        this.tableService = tableService;
    }

    /**
     * Lists all tables in the establishment.
     *
     * @return List of all table DTOs
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List all tables")
    @ApiResponse(responseCode = "200", description = "Tables retrieved")
    public List<TableResponseDTO> getAllTables() {
        return tableService.getAllTables().stream().map(TableResponseDTO::from).toList();
    }

    /**
     * Retrieves table details by its identifier.
     *
     * @param id Table identifier
     * @return Found table DTO
     */
    @GetMapping("/{id:\\d+}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get table by ID")
    @ApiResponse(responseCode = "200", description = "Table found")
    @ApiResponse(responseCode = "404", description = "Table not found")
    public ResponseEntity<TableResponseDTO> getTableById(@Parameter(description = "Table ID") @PathVariable Long id) {
        return tableService.getTableById(id)
            .map(TableResponseDTO::from)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Lists configured zones in the establishment.
     *
     * @return List of zone names
     */
    @GetMapping("/zones")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List all configured zones in the bar")
    @ApiResponse(responseCode = "200", description = "List of zone names")
    public List<String> getAllZones() {
        return tableService.getAllZones();
    }

    @GetMapping("/zone/{zone}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List tables by zone")
    @ApiResponse(responseCode = "200", description = "Tables retrieved")
    public List<TableResponseDTO> getTablesByZone(@Parameter(description = "Geographic zone") @PathVariable String zone) {
        return tableService.getTablesByZone(zone).stream().map(TableResponseDTO::from).toList();
    }

    /**
     * Lists tables filtered by their occupancy state.
     *
     * @param occupee True for occupied tables, false for free tables
     * @return List of tables matching occupancy
     */
    @GetMapping("/occupee/{occupee}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List tables by occupancy status")
    @ApiResponse(responseCode = "200", description = "Tables retrieved")
    public List<TableResponseDTO> getTablesByOccupee(@Parameter(description = "Occupancy status") @PathVariable boolean occupee) {
        return tableService.getTablesByOccupee(occupee).stream().map(TableResponseDTO::from).toList();
    }

    /**
     * Lists tables assigned to a specific server.
     *
     * @param serveurId Server user identifier
     * @return List of tables assigned to the server
     */
    @GetMapping("/serveur/{serveurId:\\d+}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List tables assigned to a server")
    @ApiResponse(responseCode = "200", description = "Server tables retrieved")
    public List<TableResponseDTO> getTablesByServeurId(@Parameter(description = "Server user ID") @PathVariable Long serveurId) {
        return tableService.getTablesByServeurId(serveurId).stream().map(TableResponseDTO::from).toList();
    }

    /**
     * Creates a new table.
     *
     * @param request Table data to create
     * @return DTO of the created table
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Create a new table (MANAGER/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Table created")
    public TableResponseDTO createTable(@Valid @RequestBody TableRequestDTO request) {
        return TableResponseDTO.from(tableService.createTable(request.toEntity()));
    }

    /**
     * Updates an existing table.
     *
     * @param id            Identifier of the table
     * @param request Updated table data
     * @return DTO of the updated table
     */
    @PutMapping("/{id:\\d+}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Update a table (MANAGER/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Table updated")
    public ResponseEntity<TableResponseDTO> updateTable(
        @Parameter(description = "Table ID") @PathVariable Long id,
        @Valid @RequestBody TableRequestDTO request) {
        return ResponseEntity.ok(TableResponseDTO.from(tableService.updateTable(id, request.toEntity())));
    }

    /**
     * Deletes a table.
     *
     * @param id Table identifier
     * @return HTTP 200 OK
     */
    @DeleteMapping("/{id:\\d+}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Delete a table (MANAGER/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Table deleted")
    public ResponseEntity<Void> deleteTable(@Parameter(description = "Table ID") @PathVariable Long id) {
        tableService.deleteTable(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Marks a table as occupied and assigns an optional server.
     *
     * @param id Table identifier
     * @param serveurId Optional server user identifier
     * @return Updated table DTO
     */
    @RequestMapping(value = "/{id:\\d+}/occuper", method = {RequestMethod.POST, RequestMethod.PATCH})
    @PreAuthorize("hasRole('SERVEUR') or hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Mark table as occupied (SERVEUR/MANAGER/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Table marked as occupied")
    public ResponseEntity<TableResponseDTO> occuperTable(
        @PathVariable Long id,
        @RequestParam(required = false) Long serveurId) {
        return ResponseEntity.ok(TableResponseDTO.from(tableService.occuperTable(id, serveurId)));
    }

    /**
     * Liberates a table (resets its state to FREE).
     *
     * @param id Table identifier
     * @return Liberated table DTO
     */
    @RequestMapping(value = "/{id:\\d+}/liberer", method = {RequestMethod.POST, RequestMethod.PATCH})
    @PreAuthorize("hasRole('SERVEUR') or hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Liberate a table (SERVEUR/MANAGER/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Table liberated")
    public ResponseEntity<TableResponseDTO> libererTable(@PathVariable Long id) {
        return ResponseEntity.ok(TableResponseDTO.from(tableService.libererTable(id)));
    }

    /**
     * Retrieves full 2D floor plan with coordinates (X, Y) and geometric shapes for Konva.js canvas.
     *
     * @return List of tables enriched with canvas positioning data
     */
    @GetMapping({"/plan", "/positions"})
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get interactive floor plan with Konva.js coordinates")
    @ApiResponse(responseCode = "200", description = "Floor plan retrieved with coordinates")
    public List<PlanSalleDTO> getPlanSalle() {
        return tableService.getAllTablesAvecPositions()
            .stream().map(PlanSalleDTO::from).toList();
    }

    /**
     * Updates 2D position (X, Y, rotation, shape) of a table on the floor plan canvas.
     *
     * @param id Table identifier
     * @param x X coordinate
     * @param y Y coordinate
     * @param rotation Rotation angle
     * @param forme Shape (Round, Square, Rectangular)
     * @return Updated table DTO
     */
    @PutMapping("/{id:\\d+}/position")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Update 2D table coordinates (MANAGER/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Coordinates saved")
    public ResponseEntity<TableResponseDTO> updatePosition(
        @PathVariable Long id,
        @RequestParam Double x,
        @RequestParam Double y,
        @RequestParam(required = false) Double rotation,
        @RequestParam(required = false) String forme) {
        return ResponseEntity.ok(TableResponseDTO.from(
            tableService.updatePosition(id, x, y, rotation, forme)));
    }

    /**
     * Batch updates layout positions for multiple floor plan tables (drag & drop batch).
     *
     * @param positions List of positioning DTOs
     * @return HTTP 200 OK
     */
    @PutMapping({"/plan/positions", "/positions"})
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Batch save floor plan table positions (drag & drop batch)")
    @ApiResponse(responseCode = "200", description = "Positions saved")
    public ResponseEntity<Void> updatePositionsBatch(@RequestBody List<TablePositionDTO> positions) {
        tableService.updatePositionsBatch(positions);
        return ResponseEntity.ok().build();
    }

    /**
     * Transfers active orders from a source table to a target table.
     *
     * @param sourceId Source table ID
     * @param targetId Destination table ID
     * @return Updated target table DTO
     */
    @PostMapping("/{sourceId:\\d+}/transfer/{targetId:\\d+}")
    @PreAuthorize("hasRole('SERVEUR') or hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Transfer orders from one table to another (SERVEUR/MANAGER/ADMIN)")
    @ApiResponse(responseCode = "200", description = "Orders transferred")
    public ResponseEntity<TableResponseDTO> transfererCommandes(
        @Parameter(description = "Source table ID") @PathVariable Long sourceId,
        @Parameter(description = "Destination table ID") @PathVariable Long targetId) {
        return ResponseEntity.ok(TableResponseDTO.from(tableService.transfererCommandes(sourceId, targetId)));
    }

    /**
     * Generates a digital ordering QR code image for a table.
     *
     * @param id Table identifier
     * @param format Image format (PNG or SVG)
     * @param size Dimension in pixels
     * @return Generated image binary content
     */
    @GetMapping("/{id:\\d+}/qrcode")
    @Operation(summary = "Generate digital ordering QR code for a table (PNG or SVG)")
    @ApiResponse(responseCode = "200", description = "QR code generated successfully")
    @ApiResponse(responseCode = "404", description = "Table not found")
    public ResponseEntity<byte[]> getTableQrCode(
        @Parameter(description = "Table ID") @PathVariable Long id,
        @Parameter(description = "Format: PNG or SVG") @RequestParam(defaultValue = "PNG") String format,
        @Parameter(description = "Image size in pixels") @RequestParam(defaultValue = "300") int size) {
        byte[] qrBytes = tableService.generateTableQrCode(id, format, size);
        String cleanFormat = format != null ? format.toLowerCase() : "png";
        MediaType mediaType = "svg".equalsIgnoreCase(cleanFormat)
            ? MediaType.valueOf("image/svg+xml")
            : MediaType.IMAGE_PNG;

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"table-" + id + "-qrcode." + cleanFormat + "\"")
            .contentType(mediaType)
            .body(qrBytes);
    }

    /**
     * Generates a printable A4 PDF containing table QR codes, physical table stands (chevalets),
     * cards, or adhesive stickers.
     *
     * @param layout Export layout format (STAND, CARD, STICKER)
     * @param tableIds Optional list of table IDs (all tables if omitted)
     * @param includeWifi Whether to include establishment Wi-Fi connection QR code
     * @return Generated PDF binary content
     */
    @GetMapping("/qrcodes/pdf")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('SERVEUR')")
    @Operation(summary = "Export printable A4 PDF with table QR codes / table stands (STAND, CARD, STICKER)")
    @ApiResponse(responseCode = "200", description = "PDF generated successfully")
    public ResponseEntity<byte[]> getTableQrCodesPdf(
        @Parameter(description = "Layout: STAND, CARD, STICKER") @RequestParam(defaultValue = "STAND") String layout,
        @Parameter(description = "Optional table IDs list") @RequestParam(required = false) List<Long> tableIds,
        @Parameter(description = "Include Wi-Fi pairing QR code") @RequestParam(required = false) Boolean includeWifi) {
        byte[] pdfBytes = tableService.generateTablesQrCodePdf(tableIds, layout, includeWifi);
        String filename = "openbar-tables-qrcodes-" + (layout != null ? layout.toLowerCase() : "stand") + ".pdf";

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdfBytes);
    }
}
