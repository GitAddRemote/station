import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from '@mui/material';
import type { UnitOfMeasureDto } from '../../services/catalog.service';

interface UomPickerProps {
  options: UnitOfMeasureDto[];
  value: UnitOfMeasureDto | null;
  onChange: (uom: UnitOfMeasureDto | null) => void;
  catalogKind: 'item' | 'commodity' | 'vehicle' | null;
  error?: string | null;
  disabled?: boolean;
}

const COMMODITY_CODES = new Set(['scu', 'cscu', 'uscu']);
const DISCRETE_CODES = new Set(['unit']);

function isAllowedForKind(
  uom: UnitOfMeasureDto,
  catalogKind: 'item' | 'commodity' | 'vehicle' | null,
): boolean {
  if (!catalogKind) return true;
  const code = uom.abbreviation.toLowerCase();
  if (catalogKind === 'commodity') return COMMODITY_CODES.has(code);
  return DISCRETE_CODES.has(code);
}

export const UomPicker = ({
  options,
  value,
  onChange,
  catalogKind,
  error,
  disabled,
}: UomPickerProps) => {
  const filtered = options.filter((u) => isAllowedForKind(u, catalogKind));

  return (
    <FormControl size="small" fullWidth error={Boolean(error)} disabled={disabled}>
      <InputLabel id="uom-picker-label">Unit</InputLabel>
      <Select
        labelId="uom-picker-label"
        label="Unit"
        value={value?.id ?? ''}
        data-testid="uom-picker"
        onChange={(e) => {
          const selected = options.find((u) => u.id === e.target.value) ?? null;
          onChange(selected);
        }}
        renderValue={(selected) => {
          const uom = options.find((u) => u.id === selected);
          return uom ? uom.abbreviation : '';
        }}
      >
        {filtered.map((uom) => (
          <MenuItem key={uom.id} value={uom.id}>
            <Tooltip
              title={
                uom.scaleFactor !== 1
                  ? `Scale: ×${uom.scaleFactor}`
                  : ''
              }
              placement="right"
              disableHoverListener={uom.scaleFactor === 1}
            >
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {uom.name} ({uom.abbreviation})
                </Typography>
                {uom.scaleFactor !== 1 && (
                  <Typography variant="caption" color="text.secondary">
                    1 {uom.abbreviation} = {uom.scaleFactor} SCU
                  </Typography>
                )}
              </span>
            </Tooltip>
          </MenuItem>
        ))}
      </Select>
      {error && (
        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
          {error}
        </Typography>
      )}
    </FormControl>
  );
};

export default UomPicker;
