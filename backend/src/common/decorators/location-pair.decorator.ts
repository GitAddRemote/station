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
      propertyName: 'locationType',
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
          return hasType === hasId;
        },
      },
    });
  };
}
