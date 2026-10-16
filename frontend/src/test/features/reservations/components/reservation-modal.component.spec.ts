import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { ReservationModalComponent } from '../../../../app/features/reservations/components/reservation-modal/reservation-modal.component';
import { ReservationService } from '../../../../app/core/services/reservation.service';
import { PlanSalleService } from '../../../../app/features/plan-salle/services/plan-salle.service';
import { EtageService } from '../../../../app/core/services/etage.service';
import { ZoneService } from '../../../../app/core/services/zone.service';
import { TableBar } from '../../../../app/core/models/table.model';
import { Reservation } from '../../../../app/core/models/reservation.model';
import { getTranslocoTestingModule } from '../../../transloco-testing.module';

describe('ReservationModalComponent', () => {
  let component: ReservationModalComponent;
  let fixture: ComponentFixture<ReservationModalComponent>;
  let reservationServiceSpy: jasmine.SpyObj<ReservationService>;
  let planSalleServiceSpy: jasmine.SpyObj<PlanSalleService>;
  let etageServiceSpy: jasmine.SpyObj<EtageService>;
  let zoneServiceSpy: jasmine.SpyObj<ZoneService>;

  const mockTables: TableBar[] = [
    { id: 10, numero: 1, capacite: 2, occupee: false, zone: 'SALLE', createdAt: '', updatedAt: '' },
    { id: 20, numero: 2, capacite: 4, occupee: true, zone: 'SALLE', createdAt: '', updatedAt: '' },
  ];

  const mockReservation: Reservation = {
    id: 1,
    nomClient: 'Jean Dupont',
    telephone: '+33612345678',
    email: 'jean.dupont@email.fr',
    dateReservation: '2026-08-15',
    heureReservation: '19:30',
    dureeMinutes: 90,
    nombrePersonnes: 2,
    statut: 'CONFIRMED',
    tableId: 10,
    tableNumero: 1,
    createdAt: '',
    updatedAt: '',
  };

  beforeEach(async () => {
    reservationServiceSpy = jasmine.createSpyObj('ReservationService', [
      'checkAvailability',
      'getSuggestions',
      'createReservation',
      'updateReservation',
      'getReservations',
      'seatReservation',
    ]);
    reservationServiceSpy.checkAvailability.and.returnValue(of({
      available: true,
      capacitySufficient: true,
      conflictingBookings: [],
      message: 'Available',
    }));
    reservationServiceSpy.getSuggestions.and.returnValue(of([
      { id: 2, nomClient: 'Jean Dupont', telephone: '+33612345678', email: 'jean@dupont.fr' } as Reservation,
    ]));
    reservationServiceSpy.createReservation.and.returnValue(of(mockReservation));
    reservationServiceSpy.updateReservation.and.returnValue(of(mockReservation));
    reservationServiceSpy.getReservations.and.returnValue(of([]));
    reservationServiceSpy.seatReservation.and.returnValue(of(mockReservation));

    planSalleServiceSpy = jasmine.createSpyObj('PlanSalleService', ['getPositions']);
    planSalleServiceSpy.getPositions.and.returnValue(of([
      { tableId: 10, x: 100, y: 100, width: 80, height: 80, rotation: 0, shape: 'rect', floor: 'RDC', zone: 'SALLE' },
      { tableId: 20, x: 300, y: 100, width: 100, height: 100, rotation: 45, shape: 'circle', floor: 'ETAGE_1', zone: 'MEZZANINE' },
    ]));

    etageServiceSpy = jasmine.createSpyObj('EtageService', ['getAll']);
    etageServiceSpy.getAll.and.returnValue(of([
      { code: 'RDC', nom: 'Rez-de-chaussée' },
      { code: 'ETAGE_1', nom: '1er Étage' },
    ]));

    zoneServiceSpy = jasmine.createSpyObj('ZoneService', ['getAll']);
    zoneServiceSpy.getAll.and.returnValue(of([
      { id: 1, nom: 'SALLE', etage: 'RDC' },
      { id: 2, nom: 'MEZZANINE', etage: 'ETAGE_1' },
      { id: 3, nom: 'TERRASSE', etage: 'RDC' },
      { id: 4, nom: 'BAR', etage: 'RDC' },
      { id: 5, nom: 'ROOFTOP', etage: 'ETAGE_2' },
    ]));

    await TestBed.configureTestingModule({
      imports: [
        ReservationModalComponent,
        HttpClientTestingModule,
        getTranslocoTestingModule(),
      ],
      providers: [
        { provide: ReservationService, useValue: reservationServiceSpy },
        { provide: PlanSalleService, useValue: planSalleServiceSpy },
        { provide: EtageService, useValue: etageServiceSpy },
        { provide: ZoneService, useValue: zoneServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReservationModalComponent);
    component = fixture.componentInstance;
    component.tables = mockTables;
    fixture.detectChanges();
  });

  it('should create modal component', () => {
    expect(component).toBeTruthy();
  });

  it('initializes form with defaults for new reservation', () => {
    expect(component.reservationForm.get('nomClient')?.value).toBe('');
    expect(component.reservationForm.get('dureeMinutes')?.value).toBe(90);
    expect(component.reservationForm.get('nombrePersonnes')?.value).toBe(2);
    expect(component.reservationForm.get('statut')?.value).toBe('CONFIRMED');
  });

  it('populates form when reservationToEdit is provided', () => {
    component.reservationToEdit = mockReservation;
    component.initForm();

    expect(component.reservationForm.get('nomClient')?.value).toBe('Jean Dupont');
    expect(component.reservationForm.get('tableId')?.value).toBe(10);
    expect(component.reservationToEdit).toBeTruthy();
  });

  it('pre-fills all form fields dynamically when reservationToEdit changes and isOpen is true', () => {
    component.isOpen = true;
    component.reservationToEdit = mockReservation;
    component.populateForm();

    expect(component.reservationForm.get('nomClient')?.value).toBe('Jean Dupont');
    expect(component.reservationForm.get('telephone')?.value).toBe('+33612345678');
    expect(component.reservationForm.get('email')?.value).toBe('jean.dupont@email.fr');
    expect(component.reservationForm.get('dateReservation')?.value).toBe('2026-08-15');
    expect(component.reservationForm.get('heureReservation')?.value).toBe('19:30');
    expect(component.reservationForm.get('dureeMinutes')?.value).toBe(90);
    expect(component.reservationForm.get('nombrePersonnes')?.value).toBe(2);
    expect(component.reservationForm.get('tableId')?.value).toBe(10);
    expect(component.reservationForm.get('statut')?.value).toBe('CONFIRMED');
  });

  it('calls createReservation on valid form submit', () => {
    spyOn(component.reservationSaved, 'emit');

    component.reservationForm.patchValue({
      nomClient: 'Alice Wonderland',
      telephone: '+33611223344',
      dateReservation: '2026-08-15',
      heureReservation: '20:00',
      dureeMinutes: 90,
      nombrePersonnes: 2,
      tableId: 10,
    });

    component.saveReservation();
    expect(reservationServiceSpy.createReservation).toHaveBeenCalled();
    expect(component.reservationSaved.emit).toHaveBeenCalledWith(mockReservation);
  });

  it('calls updateReservation when editing an existing reservation', () => {
    spyOn(component.reservationSaved, 'emit');
    component.reservationToEdit = mockReservation;
    component.initForm();

    component.reservationForm.patchValue({
      nomClient: 'Jean Dupont Updated',
    });

    component.saveReservation();
    expect(reservationServiceSpy.updateReservation).toHaveBeenCalledWith(1, jasmine.objectContaining({
      nomClient: 'Jean Dupont Updated',
    }));
    expect(component.reservationSaved.emit).toHaveBeenCalledWith(mockReservation);
  });

  it('does not submit when form is invalid', () => {
    component.reservationForm.patchValue({
      nomClient: '',
    });

    component.saveReservation();
    expect(reservationServiceSpy.createReservation).not.toHaveBeenCalled();
    expect(reservationServiceSpy.updateReservation).not.toHaveBeenCalled();
  });

  it('fetches customer suggestions on typing >= 2 chars', () => {
    component.reservationForm.patchValue({ nomClient: 'Je' });
    component.onCustomerNameInput();

    expect(reservationServiceSpy.getSuggestions).toHaveBeenCalledWith('Je');
    expect(component.customerSuggestions).toHaveSize(1);
    expect(component.showSuggestions).toBeTrue();
  });

  it('clears suggestions when query is short', () => {
    component.customerSuggestions = [mockReservation];
    component.showSuggestions = true;

    component.reservationForm.patchValue({ nomClient: 'J' });
    component.onCustomerNameInput();

    expect(component.customerSuggestions).toHaveSize(0);
    expect(component.showSuggestions).toBeFalse();
  });

  it('selects a suggestion and fills client fields', () => {
    component.selectSuggestion({
      id: 99,
      nomClient: 'Paul Martin',
      telephone: '+33699887766',
      email: 'paul@martin.fr',
    } as Reservation);

    expect(component.reservationForm.get('nomClient')?.value).toBe('Paul Martin');
    expect(component.reservationForm.get('telephone')?.value).toBe('+33699887766');
    expect(component.reservationForm.get('email')?.value).toBe('paul@martin.fr');
    expect(component.showSuggestions).toBeFalse();
  });

  it('handles table, duration, and status selections', () => {
    component.onTableSelected({ value: 20, label: 'Table 2' });
    expect(component.reservationForm.get('tableId')?.value).toBe(20);

    component.onDurationSelected({ value: 120, label: '2h00' });
    expect(component.reservationForm.get('dureeMinutes')?.value).toBe(120);

    component.onStatusSelected({ value: 'SEATED', label: 'Installée' });
    expect(component.reservationForm.get('statut')?.value).toBe('SEATED');
  });

  it('checks table availability and updates availabilityCheck', () => {
    component.reservationForm.patchValue({
      tableId: 10,
      dateReservation: '2026-08-15',
      heureReservation: '20:00',
    });

    component.checkTableAvailability();
    expect(reservationServiceSpy.checkAvailability).toHaveBeenCalled();
    expect(component.availabilityCheck?.available).toBeTrue();
  });

  it('handles availability check error gracefully', () => {
    reservationServiceSpy.checkAvailability.and.returnValue(throwError(() => new Error('Network error')));
    component.reservationForm.patchValue({
      tableId: 10,
      dateReservation: '2026-08-15',
      heureReservation: '20:00',
    });

    component.checkTableAvailability();
    expect(component.availabilityCheck).toBeNull();
    expect(component.isCheckingAvailability).toBeFalse();
  });

  it('emits modalClose when close() is called', () => {
    spyOn(component.modalClose, 'emit');
    component.close();
    expect(component.modalClose.emit).toHaveBeenCalled();
  });

  it('toggles the interactive floor plan picker', () => {
    expect(component.showFloorPlanPicker).toBeFalse();
    component.toggleFloorPlanPicker();
    expect(component.showFloorPlanPicker).toBeTrue();
    expect(reservationServiceSpy.getReservations).toHaveBeenCalled();

    component.toggleFloorPlanPicker();
    expect(component.showFloorPlanPicker).toBeFalse();
  });

  it('selects table from floor plan and verifies availability', () => {
    component.tables = mockTables;
    component.selectTableFromFloorPlan(mockTables[0]);
    expect(component.reservationForm.get('tableId')?.value).toBe(10);
    expect(reservationServiceSpy.checkAvailability).toHaveBeenCalled();
  });

  it('computes table slot status accurately at instant T', () => {
    component.tables = mockTables;
    component.dayReservations = [
      {
        id: 99,
        nomClient: 'Alice',
        tableId: 10,
        dateReservation: '2026-08-15',
        heureReservation: '19:00',
        dureeMinutes: 90,
        nombrePersonnes: 2,
        statut: 'CONFIRMED',
        createdAt: '',
        updatedAt: '',
      },
    ];

    component.reservationForm.patchValue({
      heureReservation: '19:30',
      dureeMinutes: 60,
      nombrePersonnes: 2,
      tableId: null,
    });

    const statusOccupied = component.getTableSlotStatus(mockTables[0]);
    expect(statusOccupied.status).toBe('OCCUPIED');

    const statusAvailable = component.getTableSlotStatus(mockTables[1]);
    expect(statusAvailable.status).toBe('AVAILABLE');
  });

  it('saves and immediately seats guests when saveAndSeatReservation is triggered', () => {
    spyOn(component.reservationSaved, 'emit');
    spyOn(component, 'close');

    component.reservationForm.patchValue({
      nomClient: 'Claire Delacroix',
      tableId: 10,
      dateReservation: '2026-08-15',
      heureReservation: '20:00',
      dureeMinutes: 90,
      nombrePersonnes: 2,
      statut: 'CONFIRMED',
    });

    component.saveAndSeatReservation();

    expect(reservationServiceSpy.createReservation).toHaveBeenCalled();
    expect(reservationServiceSpy.seatReservation).toHaveBeenCalledWith(mockReservation.id);
    expect(component.reservationSaved.emit).toHaveBeenCalled();
    expect(component.close).toHaveBeenCalled();
  });

  it('normalizes floor code strings consistently', () => {
    expect(component.normalizeFloorCode('RDC')).toBe('RDC');
    expect(component.normalizeFloorCode('rez-de-chaussée')).toBe('RDC');
    expect(component.normalizeFloorCode('1er étage')).toBe('ETAGE_1');
    expect(component.normalizeFloorCode('ETAGE_1')).toBe('ETAGE_1');
    expect(component.normalizeFloorCode('2ème étage')).toBe('ETAGE_2');
    expect(component.normalizeFloorCode('Rooftop')).toBe('ETAGE_2');
    expect(component.normalizeFloorCode('Terrasse Haute')).toBe('TERRASSE HAUTE');
    expect(component.normalizeFloorCode(undefined)).toBe('RDC');
  });

  it('resolves table floor from position, table attribute, zone, or default', () => {
    // 1. From tablePositions
    component.tablePositions = [
      { tableId: 10, x: 0, y: 0, rotation: 0, shape: 'rect', floor: '1er Étage' },
    ];
    expect(component.resolveTableFloor(mockTables[0])).toBe('ETAGE_1');

    // 2. From table.etage
    component.tablePositions = [];
    const tableWithEtage: TableBar = { ...mockTables[0], etage: '2ème Étage' };
    expect(component.resolveTableFloor(tableWithEtage)).toBe('ETAGE_2');

    // 3. From zoneAreas matching zone
    component.zoneAreas = [
      { id: 'z1', nom: 'SALLE', etage: '1er étage', x: 0, y: 0, width: 200, height: 200 },
    ];
    expect(component.resolveTableFloor(mockTables[0])).toBe('ETAGE_1');

    // 4. Default fallback
    component.zoneAreas = [];
    expect(component.resolveTableFloor(mockTables[0])).toBe('RDC');
  });

  it('computes availableFloors from etages, detected floors, or fallback', () => {
    // 1. From etages
    component.etages = [
      { code: 'RDC', nom: 'Rez-de-chaussée' },
      { code: 'ETAGE_1', nom: '1er Étage' },
    ];
    expect(component.availableFloors).toHaveSize(2);

    // 2. From detected tables and zones when etages is empty
    component.etages = [];
    component.tables = [
      { ...mockTables[0], etage: 'RDC' },
      { ...mockTables[1], etage: 'ETAGE_1' },
    ];
    component.zoneAreas = [
      { id: 'z1', nom: 'Rooftop Lounge', etage: 'ROOFTOP', x: 0, y: 0, width: 100, height: 100 },
    ];
    const detected = component.availableFloors;
    expect(detected.some(f => f.code === 'RDC')).toBeTrue();
    expect(detected.some(f => f.code === 'ETAGE_1')).toBeTrue();
    expect(detected.some(f => f.code === 'ETAGE_2')).toBeTrue();

    // 3. Fallback when tables and zones are empty
    component.tables = [];
    component.zoneAreas = [];
    expect(component.availableFloors).toEqual([{ code: 'RDC', nom: 'RDC' }]);
  });

  it('selectFloor() updates selectedFloor and resets selectedFloorPlanZone', () => {
    component.selectedFloor = 'RDC';
    component.selectedFloorPlanZone = 'VIP';
    component.selectFloor('ETAGE_1');
    expect(component.selectedFloor).toBe('ETAGE_1');
    expect(component.selectedFloorPlanZone).toBe('ALL');
  });

  it('syncSelectedFloorWithCurrentTable() synchronizes with selected table or first floor', () => {
    component.tables = mockTables;
    component.reservationForm.patchValue({ tableId: 20 });
    component.tablePositions = [{ tableId: 20, x: 0, y: 0, rotation: 0, shape: 'rect', floor: 'ETAGE_1' }];
    component.syncSelectedFloorWithCurrentTable();
    expect(component.selectedFloor).toBe('ETAGE_1');

    component.reservationForm.patchValue({ tableId: null });
    component.etages = [{ code: 'RDC', nom: 'RDC' }];
    component.selectedFloor = 'UNKNOWN_FLOOR';
    component.syncSelectedFloorWithCurrentTable();
    expect(component.selectedFloor).toBe('RDC');
  });

  it('filters floor plan zones, tables, and zone areas according to active floor and zone', () => {
    component.selectedFloor = 'RDC';
    component.tables = [
      { ...mockTables[0], zone: 'TERRASSE' },
      { ...mockTables[1], zone: 'BAR' },
    ];
    component.zoneAreas = [
      { id: 'z1', nom: 'JARDIN', etage: 'RDC', x: 0, y: 0, width: 200, height: 200 },
      { id: 'z2', nom: 'BALCON', etage: 'ETAGE_1', x: 0, y: 0, width: 200, height: 200 },
    ];

    expect(component.floorPlanZones).toContain('TERRASSE');
    expect(component.floorPlanZones).toContain('BAR');
    expect(component.floorPlanZones).toContain('JARDIN');
    expect(component.floorPlanZones).not.toContain('BALCON');

    component.selectedFloorPlanZone = 'ALL';
    expect(component.filteredFloorPlanTables).toHaveSize(2);
    expect(component.filteredZoneAreas).toHaveSize(1);

    component.selectedFloorPlanZone = 'TERRASSE';
    expect(component.filteredFloorPlanTables).toHaveSize(1);
    expect(component.filteredFloorPlanTables[0].zone).toBe('TERRASSE');
  });

  it('computes table geometry and coordinates with getTablePosition()', () => {
    component.tablePositions = [
      { tableId: 10, x: 150, y: 250, width: 80, height: 80, rotation: 15, shape: 'rect' },
    ];
    const posCached = component.getTablePosition(mockTables[0]);
    expect(posCached.x).toBe(150);
    expect(posCached.y).toBe(250);
    expect(posCached.rotation).toBe(15);

    // Fallback grid computation
    const posFallback = component.getTablePosition(mockTables[1]);
    expect(posFallback.x).toBeGreaterThan(0);
    expect(posFallback.y).toBeGreaterThan(0);
    expect(posFallback.width).toBe(90);
  });

  it('formats polygon points and computes viewBox for SVG canvas', () => {
    expect(component.formatPolygonPoints()).toBe('');
    expect(component.formatPolygonPoints([10, 20])).toBe('');
    expect(component.formatPolygonPoints([10, 20, 30, 40])).toBe('10,20 30,40');

    component.tables = mockTables;
    component.zoneAreas = [
      { id: 'z1', nom: 'SALLE', etage: 'RDC', x: 100, y: 100, width: 300, height: 200 },
    ];
    const viewBox = component.floorPlanViewBox;
    expect(viewBox).toMatch(/^\d+\s+\d+\s+\d+\s+\d+$/);
  });

  it('adjusts zoom controls correctly', () => {
    component.floorPlanZoom = 1.0;
    component.zoomFloorPlanIn();
    expect(component.floorPlanZoom).toBe(1.15);

    component.zoomFloorPlanOut();
    expect(component.floorPlanZoom).toBe(1.0);

    component.floorPlanZoom = 1.8;
    component.resetFloorPlanZoom();
    expect(component.floorPlanZoom).toBe(1.0);
  });

  it('exposes select options for duration, status, and table', () => {
    expect(component.durationSelectOptions.length).toBeGreaterThan(0);
    expect(component.statusSelectOptions.length).toBeGreaterThan(0);
    expect(component.tableSelectOptions).toHaveSize(mockTables.length + 1); // default option + mock tables
  });

  it('selects table from floor plan and rejects occupied table', () => {
    component.tables = mockTables;
    component.dayReservations = [
      {
        id: 55,
        nomClient: 'Occupy',
        tableId: 10,
        dateReservation: '2026-08-15',
        heureReservation: '19:30',
        dureeMinutes: 90,
        nombrePersonnes: 2,
        statut: 'CONFIRMED',
        createdAt: '',
        updatedAt: '',
      },
    ];
    component.reservationForm.patchValue({ heureReservation: '19:30', dureeMinutes: 90 });

    // Table 10 is occupied -> should not be selected
    component.selectTableFromFloorPlan(mockTables[0]);
    expect(component.reservationForm.get('tableId')?.value).not.toBe(10);

    // Table 20 is free -> should be selected
    component.selectTableFromFloorPlan(mockTables[1]);
    expect(component.reservationForm.get('tableId')?.value).toBe(20);
  });

  it('handles table slot statuses for SELECTED and CAPACITY_WARNING', () => {
    component.tables = mockTables;
    component.reservationForm.patchValue({
      tableId: 10,
    });
    const statusSelected = component.getTableSlotStatus(mockTables[0]);
    expect(statusSelected.status).toBe('SELECTED');

    component.reservationForm.patchValue({
      tableId: null,
      heureReservation: '21:00',
      nombrePersonnes: 10, // capacity of table 10 is 2
    });
    const statusCapWarn = component.getTableSlotStatus(mockTables[0]);
    expect(statusCapWarn.status).toBe('CAPACITY_WARNING');
  });

  it('handles saveAndSeatReservation when tableId is missing or when editing', () => {
    component.reservationForm.patchValue({
      nomClient: 'No Table Guest',
      tableId: null,
    });
    component.saveAndSeatReservation();
    expect(reservationServiceSpy.createReservation).not.toHaveBeenCalled();

    // With reservationToEdit
    component.reservationToEdit = mockReservation;
    component.reservationForm.patchValue({
      nomClient: 'Edit Guest',
      tableId: 10,
      statut: 'CONFIRMED',
    });
    component.saveAndSeatReservation();
    expect(reservationServiceSpy.updateReservation).toHaveBeenCalled();
  });

  it('handles ngOnChanges when isOpen is toggled', () => {
    spyOn(component, 'populateForm');
    component.isOpen = true;
    component.ngOnChanges({
      isOpen: {
        currentValue: true,
        previousValue: false,
        firstChange: false,
        isFirstChange: () => false,
      },
    });
    expect(component.populateForm).toHaveBeenCalled();
  });

  it('correctly maps tables to their respective floors by zone to prevent overlap on RDC', () => {
    const tableRDC: TableBar = { id: 1, numero: 1, capacite: 4, occupee: false, zone: 'Salle Principale', createdAt: '', updatedAt: '' };
    const tableEtage1: TableBar = { id: 31, numero: 31, capacite: 6, occupee: false, zone: 'Mezzanine VIP', createdAt: '', updatedAt: '' };
    const tableEtage2: TableBar = { id: 41, numero: 41, capacite: 8, occupee: false, zone: 'Rooftop Panoramique', createdAt: '', updatedAt: '' };

    component.backendZones = [
      { id: 1, nom: 'Salle Principale', etage: 'RDC' },
      { id: 2, nom: 'Mezzanine VIP', etage: 'ETAGE_1' },
      { id: 3, nom: 'Rooftop Panoramique', etage: 'ETAGE_2' },
    ];
    component.tables = [tableRDC, tableEtage1, tableEtage2];

    expect(component.resolveTableFloor(tableRDC)).toBe('RDC');
    expect(component.resolveTableFloor(tableEtage1)).toBe('ETAGE_1');
    expect(component.resolveTableFloor(tableEtage2)).toBe('ETAGE_2');

    // On RDC: only tableRDC should be present
    component.selectedFloor = 'RDC';
    component.selectedFloorPlanZone = 'ALL';
    expect(component.filteredFloorPlanTables.map((t) => t.id)).toEqual([1]);

    // On ETAGE_1: only tableEtage1 should be present
    component.selectFloor('ETAGE_1');
    expect(component.selectedFloor).toBe('ETAGE_1');
    expect(component.filteredFloorPlanTables.map((t) => t.id)).toEqual([31]);

    // On ETAGE_2: only tableEtage2 should be present
    component.selectFloor('ETAGE_2');
    expect(component.selectedFloor).toBe('ETAGE_2');
    expect(component.filteredFloorPlanTables.map((t) => t.id)).toEqual([41]);
  });

  it('reactively reloads day reservations when dateReservation is updated', () => {
    reservationServiceSpy.getReservations.calls.reset();
    component.reservationForm.get('dateReservation')?.setValue('2026-10-12');

    expect(reservationServiceSpy.getReservations).toHaveBeenCalledWith({ date: '2026-10-12' });
  });

  it('reactively recalculates table conflict status when heureReservation changes', () => {
    const table1: TableBar = { id: 1, numero: 1, capacite: 4, occupee: false, zone: 'Salle', createdAt: '', updatedAt: '' };
    const table2: TableBar = { id: 2, numero: 2, capacite: 4, occupee: false, zone: 'Salle', createdAt: '', updatedAt: '' };
    component.tables = [table1, table2];
    component.dayReservations = [
      {
        id: 101,
        nomClient: 'Lunch Guest',
        tableId: 1,
        dateReservation: '2026-10-05',
        heureReservation: '12:30',
        dureeMinutes: 90,
        nombrePersonnes: 2,
        statut: 'CONFIRMED',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 102,
        nomClient: 'Dinner Guest',
        tableId: 2,
        dateReservation: '2026-10-05',
        heureReservation: '20:00',
        dureeMinutes: 90,
        nombrePersonnes: 2,
        statut: 'CONFIRMED',
        createdAt: '',
        updatedAt: '',
      },
    ];

    // At 12:30: Table 1 is OCCUPIED, Table 2 is AVAILABLE
    component.reservationForm.patchValue({
      heureReservation: '12:30',
      dureeMinutes: 90,
      tableId: null,
    });
    expect(component.getTableSlotStatus(table1).status).toBe('OCCUPIED');
    expect(component.getTableSlotStatus(table2).status).toBe('AVAILABLE');

    // When changing time to 20:30: Table 1 becomes AVAILABLE, Table 2 becomes OCCUPIED
    component.reservationForm.patchValue({
      heureReservation: '20:30',
      dureeMinutes: 90,
      tableId: null,
    });
    expect(component.getTableSlotStatus(table1).status).toBe('AVAILABLE');
    expect(component.getTableSlotStatus(table2).status).toBe('OCCUPIED');
  });

  it('handles array and string time formats robustly in timeToMinutes and formatTimeDisplay', () => {
    // Array format from Jackson LocalTime
    expect(component.timeToMinutes([20, 30])).toBe(1230);
    expect(component.formatTimeDisplay([20, 30])).toBe('20:30');

    // String format with seconds
    expect(component.timeToMinutes('20:30:00')).toBe(1230);
    expect(component.formatTimeDisplay('20:30:00')).toBe('20:30');

    // Standard string format
    expect(component.timeToMinutes('12:15')).toBe(735);
    expect(component.formatTimeDisplay('12:15')).toBe('12:15');

    // Falsy values
    expect(component.timeToMinutes(null)).toBe(0);
    expect(component.formatTimeDisplay(null)).toBe('');
  });

  it('onDateOrTimeChanged triggers loadDayReservations and checkTableAvailability', () => {
    reservationServiceSpy.getReservations.calls.reset();
    reservationServiceSpy.checkAvailability.calls.reset();

    component.reservationForm.patchValue({
      dateReservation: '2026-11-20',
      heureReservation: '19:00',
      tableId: 10,
    });

    component.onDateOrTimeChanged();

    expect(reservationServiceSpy.getReservations).toHaveBeenCalledWith({ date: '2026-11-20' });
    expect(reservationServiceSpy.checkAvailability).toHaveBeenCalled();
  });

  it('supports 2D mouse drag-to-pan on the floor plan canvas', () => {
    expect(component.floorPlanPanX).toBe(0);
    expect(component.floorPlanPanY).toBe(0);
    expect(component.floorPlanTransform).toBe('translate(0px, 0px) scale(1)');

    // Start mouse drag
    component.onFloorPlanMouseDown({ button: 0, clientX: 100, clientY: 100 } as MouseEvent);
    expect(component.isPanningFloorPlan).toBeTrue();

    // Move mouse
    component.onFloorPlanMouseMove({ clientX: 150, clientY: 120 } as MouseEvent);
    expect(component.floorPlanPanX).toBe(50);
    expect(component.floorPlanPanY).toBe(20);
    expect(component.hasDraggedFloorPlan).toBeTrue();
    expect(component.floorPlanTransform).toBe('translate(50px, 20px) scale(1)');

    // Mouse up ends pan
    component.onFloorPlanMouseUp();
    expect(component.isPanningFloorPlan).toBeFalse();
  });

  it('supports touch drag-to-pan for mobile and PWA', () => {
    component.resetFloorPlanZoom();

    // Touch start
    component.onFloorPlanTouchStart({
      touches: [{ clientX: 200, clientY: 200 }] as unknown as TouchList,
    } as TouchEvent);
    expect(component.isPanningFloorPlan).toBeTrue();

    // Touch move
    component.onFloorPlanTouchMove({
      touches: [{ clientX: 180, clientY: 150 }] as unknown as TouchList,
    } as TouchEvent);
    expect(component.floorPlanPanX).toBe(-20);
    expect(component.floorPlanPanY).toBe(-50);

    // Touch end
    component.onFloorPlanTouchEnd();
    expect(component.isPanningFloorPlan).toBeFalse();
  });

  it('supports mouse wheel zooming on the floor plan', () => {
    component.resetFloorPlanZoom();
    expect(component.floorPlanZoom).toBe(1.0);

    // Zoom in with wheel
    const wheelInEvent = { deltaY: -100, preventDefault: jasmine.createSpy('preventDefault') } as unknown as WheelEvent;
    component.onFloorPlanWheel(wheelInEvent);
    expect(wheelInEvent.preventDefault).toHaveBeenCalled();
    expect(component.floorPlanZoom).toBe(1.15);

    // Zoom out with wheel
    const wheelOutEvent = { deltaY: 100, preventDefault: jasmine.createSpy('preventDefault') } as unknown as WheelEvent;
    component.onFloorPlanWheel(wheelOutEvent);
    expect(wheelOutEvent.preventDefault).toHaveBeenCalled();
    expect(component.floorPlanZoom).toBe(1.0);
  });

  it('does not select a table when user was panning the canvas', () => {
    const table: TableBar = { id: 7, numero: 7, capacite: 4, occupee: false, zone: 'Salle', createdAt: '', updatedAt: '' };
    component.tables = [table];
    component.reservationForm.get('tableId')?.setValue(null);

    // Flagged as dragged
    component.hasDraggedFloorPlan = true;
    component.selectTableFromFloorPlan(table);

    // Table was NOT selected because it was a pan drag
    expect(component.reservationForm.get('tableId')?.value).toBeNull();
  });

  it('resets pan coordinates when switching floor level or clicking reset view', () => {
    component.floorPlanPanX = 120;
    component.floorPlanPanY = 80;
    component.floorPlanZoom = 2.0;

    component.resetFloorPlanZoom();
    expect(component.floorPlanPanX).toBe(0);
    expect(component.floorPlanPanY).toBe(0);
    expect(component.floorPlanZoom).toBe(1.0);

    // When switching floor
    component.floorPlanPanX = 50;
    component.selectFloor('ETAGE_1');
    expect(component.floorPlanPanX).toBe(0);
    expect(component.floorPlanPanY).toBe(0);
  });
});
