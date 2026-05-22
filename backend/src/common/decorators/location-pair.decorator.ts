import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Class-level decorator that enforces locationType and locationUexId must be
 * provided together or both omitted. Apply to any DTO that has both fields.
 */
export function LocationPairRequired(
  validationOptions?: ValidationOptions,
): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (target: any) {
    registerDecorator({
      name: 'locationPairRequired',
      target: target as new (...args: unknown[]) => unknown,
      propertyName: '__locationPair',
      options: {
        message:
          'locationType and locationUexId must both be provided or both omitted',
        ...validationOptions,
      },
      validator: {
        validate(_value: unknown, args: ValidationArguments): boolean {
          const obj = args.object as Record<string, unknown>;
          const hasType = Object.prototype.hasOwnProperty.call(
            obj,
            'locationType',
          );
          const hasId = Object.prototype.hasOwnProperty.call(
            obj,
            'locationUexId',
          );
          if (hasType !== hasId) return false;
          if (!hasType) return true;
          const typeIsNull =
            obj.locationType === null || obj.locationType === undefined;
          const idIsNull =
            obj.locationUexId === null || obj.locationUexId === undefined;
          return typeIsNull === idIsNull;
        },
      },
    });
  };
}
