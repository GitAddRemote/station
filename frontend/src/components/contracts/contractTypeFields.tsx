export type ContractType = 'transport' | 'transfer' | 'mining' | 'security' | 'salvage' | 'medical' | 'refueling';

export interface TransportDetails {
  pickupLocationId: string;
  pickupLocationName: string;
  deliveryLocationName: string;
  cargoDescription: string;
  scuRequired: string;
}
export interface MiningDetails {
  targetSystem: string;
  targetBody: string;
  resourceType: string;
  targetScu: string;
  miningMethod: 'hand' | 'vehicle' | 'ship' | '';
}
export interface SecurityDetails {
  missionKind: 'escort' | 'patrol' | 'base-defense' | '';
  areaDescription: string;
  threatLevel: 'low' | 'medium' | 'high' | '';
  headCount: string;
}
export interface SalvageDetails {
  targetLocation: string;
  scuEstimate: string;
  salvageKind: 'wreck' | 'recycle' | 'tow' | '';
}
export interface MedicalDetails {
  serviceKind: 'rescue' | 'trauma' | 'support' | '';
  locationDescription: string;
  patientCount: string;
}
export interface RefuelingDetails {
  fuelType: 'hydrogen' | 'quantum' | '';
  scuRequired: string;
  locationDescription: string;
}
export type TypeDetails =
  | TransportDetails | MiningDetails | SecurityDetails
  | SalvageDetails | MedicalDetails | RefuelingDetails
  | Record<string, never>;

export function defaultDetails(type: ContractType): TypeDetails {
  switch (type) {
    case 'transport':  return { pickupLocationId: '', pickupLocationName: '', deliveryLocationName: '', cargoDescription: '', scuRequired: '' };
    case 'mining':     return { targetSystem: '', targetBody: '', resourceType: '', targetScu: '', miningMethod: '' };
    case 'security':   return { missionKind: '', areaDescription: '', threatLevel: '', headCount: '' };
    case 'salvage':    return { targetLocation: '', scuEstimate: '', salvageKind: '' };
    case 'medical':    return { serviceKind: '', locationDescription: '', patientCount: '' };
    case 'refueling':  return { fuelType: '', scuRequired: '', locationDescription: '' };
    default:           return {};
  }
}

export function detailsFromRecord(type: ContractType, saved: Record<string, unknown> | null): TypeDetails {
  const defaults = defaultDetails(type) as Record<string, unknown>;
  if (!saved) return defaults as TypeDetails;
  const merged: Record<string, unknown> = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (saved[key] !== undefined && saved[key] !== null) {
      merged[key] = String(saved[key]);
    }
  }
  return merged as TypeDetails;
}

export function buildDetailsPayload(type: ContractType, details: TypeDetails): Record<string, unknown> | null {
  const entries = Object.entries(details).filter(([, v]) => v !== '' && v !== null && v !== undefined);
  if (entries.length === 0) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of entries) out[k] = v;
  const numKeys = ['scuRequired', 'targetScu', 'scuEstimate'];
  if (['transport', 'mining', 'salvage', 'refueling'].includes(type)) {
    for (const key of numKeys) {
      if (key in out && out[key] !== '') out[key] = parseFloat(out[key] as string);
    }
  }
  if (type === 'security' && 'headCount' in out && out['headCount'] !== '') out['headCount'] = parseInt(out['headCount'] as string, 10);
  if (type === 'medical' && 'patientCount' in out && out['patientCount'] !== '') out['patientCount'] = parseInt(out['patientCount'] as string, 10);
  return out;
}

export function TypeSpecificFields({ type, details, onChange }: { type: ContractType; details: TypeDetails; onChange: (next: TypeDetails) => void }) {
  function set(key: string, value: string) { onChange({ ...details, [key]: value } as TypeDetails); }

  if (type === 'transfer') return null;

  if (type === 'transport') {
    const d = details as TransportDetails;
    return (<>
      <div className="field-row"><label className="field-label">Pickup location</label><input className="field-input" type="text" value={d.pickupLocationName} onChange={(e) => set('pickupLocationName', e.target.value)} placeholder="e.g. Port Olisar" /></div>
      <div className="field-row"><label className="field-label">Delivery location</label><input className="field-input" type="text" value={d.deliveryLocationName} onChange={(e) => set('deliveryLocationName', e.target.value)} placeholder="e.g. Area 18" /></div>
      <div className="field-row"><label className="field-label">Cargo description</label><input className="field-input" type="text" value={d.cargoDescription} onChange={(e) => set('cargoDescription', e.target.value)} placeholder="e.g. Medical supplies" /></div>
      <div className="field-row"><label className="field-label">SCU required</label><input className="field-input" type="number" min="0" step="0.001" value={d.scuRequired} onChange={(e) => set('scuRequired', e.target.value)} placeholder="0" /></div>
    </>);
  }

  if (type === 'mining') {
    const d = details as MiningDetails;
    return (<>
      <div className="field-row"><label className="field-label">Target system</label><input className="field-input" type="text" value={d.targetSystem} onChange={(e) => set('targetSystem', e.target.value)} placeholder="e.g. Stanton" /></div>
      <div className="field-row"><label className="field-label">Target body</label><input className="field-input" type="text" value={d.targetBody} onChange={(e) => set('targetBody', e.target.value)} placeholder="e.g. Yela" /></div>
      <div className="field-row"><label className="field-label">Resource type</label><input className="field-input" type="text" value={d.resourceType} onChange={(e) => set('resourceType', e.target.value)} placeholder="e.g. Quantanium" /></div>
      <div className="field-row"><label className="field-label">Target SCU</label><input className="field-input" type="number" min="0" step="0.001" value={d.targetScu} onChange={(e) => set('targetScu', e.target.value)} placeholder="0" /></div>
      <div className="field-row"><label className="field-label">Mining method</label>
        <select className="field-input" value={d.miningMethod} onChange={(e) => set('miningMethod', e.target.value)}>
          <option value="">— unspecified —</option><option value="hand">Hand mining</option><option value="vehicle">Vehicle</option><option value="ship">Ship</option>
        </select>
      </div>
    </>);
  }

  if (type === 'security') {
    const d = details as SecurityDetails;
    return (<>
      <div className="field-row"><label className="field-label">Mission kind</label>
        <select className="field-input" value={d.missionKind} onChange={(e) => set('missionKind', e.target.value)}>
          <option value="">— unspecified —</option><option value="escort">Escort</option><option value="patrol">Patrol</option><option value="base-defense">Base defense</option>
        </select>
      </div>
      <div className="field-row"><label className="field-label">Area description</label><input className="field-input" type="text" value={d.areaDescription} onChange={(e) => set('areaDescription', e.target.value)} placeholder="e.g. Convoy route A18 → Lorville" /></div>
      <div className="field-row"><label className="field-label">Threat level</label>
        <select className="field-input" value={d.threatLevel} onChange={(e) => set('threatLevel', e.target.value)}>
          <option value="">— unspecified —</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
        </select>
      </div>
      <div className="field-row"><label className="field-label">Head count</label><input className="field-input" type="number" min="1" step="1" value={d.headCount} onChange={(e) => set('headCount', e.target.value)} placeholder="1" /></div>
    </>);
  }

  if (type === 'salvage') {
    const d = details as SalvageDetails;
    return (<>
      <div className="field-row"><label className="field-label">Target location</label><input className="field-input" type="text" value={d.targetLocation} onChange={(e) => set('targetLocation', e.target.value)} placeholder="e.g. Derelict Reclaimer near Yela" /></div>
      <div className="field-row"><label className="field-label">SCU estimate</label><input className="field-input" type="number" min="0" step="0.001" value={d.scuEstimate} onChange={(e) => set('scuEstimate', e.target.value)} placeholder="0" /></div>
      <div className="field-row"><label className="field-label">Salvage kind</label>
        <select className="field-input" value={d.salvageKind} onChange={(e) => set('salvageKind', e.target.value)}>
          <option value="">— unspecified —</option><option value="wreck">Wreck salvage</option><option value="recycle">Recycle</option><option value="tow">Tow</option>
        </select>
      </div>
    </>);
  }

  if (type === 'medical') {
    const d = details as MedicalDetails;
    return (<>
      <div className="field-row"><label className="field-label">Service kind</label>
        <select className="field-input" value={d.serviceKind} onChange={(e) => set('serviceKind', e.target.value)}>
          <option value="">— unspecified —</option><option value="rescue">Rescue</option><option value="trauma">Trauma</option><option value="support">Support</option>
        </select>
      </div>
      <div className="field-row"><label className="field-label">Location description</label><input className="field-input" type="text" value={d.locationDescription} onChange={(e) => set('locationDescription', e.target.value)} placeholder="e.g. Moon surface, Cellin" /></div>
      <div className="field-row"><label className="field-label">Patient count</label><input className="field-input" type="number" min="1" step="1" value={d.patientCount} onChange={(e) => set('patientCount', e.target.value)} placeholder="1" /></div>
    </>);
  }

  if (type === 'refueling') {
    const d = details as RefuelingDetails;
    return (<>
      <div className="field-row"><label className="field-label">Fuel type</label>
        <select className="field-input" value={d.fuelType} onChange={(e) => set('fuelType', e.target.value)}>
          <option value="">— unspecified —</option><option value="hydrogen">Hydrogen</option><option value="quantum">Quantum</option>
        </select>
      </div>
      <div className="field-row"><label className="field-label">SCU required</label><input className="field-input" type="number" min="0" step="0.001" value={d.scuRequired} onChange={(e) => set('scuRequired', e.target.value)} placeholder="0" /></div>
      <div className="field-row"><label className="field-label">Location description</label><input className="field-input" type="text" value={d.locationDescription} onChange={(e) => set('locationDescription', e.target.value)} placeholder="e.g. Near Lagrange point" /></div>
    </>);
  }

  return null;
}
