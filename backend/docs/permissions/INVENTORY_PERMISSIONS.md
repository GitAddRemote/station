# Inventory Permissions Matrix

This document defines the permission model for inventory features in Station.

## Permission Definitions

| Permission                     | Description                                               | Use Cases                                                       |
| ------------------------------ | --------------------------------------------------------- | --------------------------------------------------------------- |
| `can_view_org_inventory`       | View organization-owned inventory and member-shared items | Dashboard views, reports, searching inventory                   |
| `can_edit_org_inventory`       | Create, update, and delete organization inventory items   | Adding new items, updating quantities, removing items           |
| `can_admin_org_inventory`      | Manage inventory settings, bulk operations, and exports   | Bulk imports/exports, settings configuration, advanced features |
| `can_view_member_shared_items` | View items that members have shared with the organization | Member contribution tracking, shared resource viewing           |

## Role Permission Mappings

| Role                  | can_view_org_inventory | can_edit_org_inventory | can_admin_org_inventory | can_view_member_shared_items |
| --------------------- | :--------------------: | :--------------------: | :---------------------: | :--------------------------: |
| **Member**            |           ✅           |           ❌           |           ❌            |              ✅              |
| **Inventory Manager** |           ✅           |           ✅           |           ✅            |              ✅              |
| **Director**          |           ✅           |           ✅           |           ✅            |              ✅              |
| **Admin**             |           ✅           |           ✅           |           ✅            |              ✅              |

## API Endpoint Permissions

| Endpoint                       | Method | Required Permission(s)         | Description                           |
| ------------------------------ | ------ | ------------------------------ | ------------------------------------- |
| `/api/inventory/:itemId/share` | POST   | None (user owns item)          | Share user's own item with org        |
| `/api/inventory/:itemId/share` | DELETE | None (user owns item)          | Unshare user's own item               |
| `/api/inventory/shared`        | GET    | `can_view_member_shared_items` | View items shared by members          |
| `/api/inventory/audit-log`     | GET    | `can_admin_org_inventory`      | View audit logs for inventory changes |

## Permission Checking Flow

1. **Authentication** - User must be authenticated (JWT token)
2. **Organization Context** - Extract `orgId` from request (params, query, or body)
3. **Permission Lookup** - Fetch user's roles in the organization from cache/database
4. **Permission Aggregation** - Combine permissions from all user's roles
5. **Authorization** - Check if user has ALL required permissions
6. **Access Granted/Denied** - Return 200 or 403 with clear error message

## Caching Strategy

- **Cache Key**: `permissions:user:{userId}:org:{orgId}`
- **TTL**: 15 minutes (900 seconds)
- **Invalidation**: When user roles change in the organization

## Performance Targets

- Permission check (cached): < 10ms
- Permission check (uncached): < 50ms
- Cache hit rate: > 95%

## Adding New Permissions

To add a new inventory permission:

1. Add to `OrgPermission` enum in `src/modules/permissions/permissions.constants.ts`
2. Update `DEFAULT_ROLE_PERMISSIONS` for each role
3. Add description to `PERMISSION_DESCRIPTIONS`
4. Create migration to update existing role records
5. Add permission checks to relevant endpoints using `@RequirePermission()`
6. Update this documentation
7. Write tests for the new permission

## Examples

### Applying Permission to Endpoint

```typescript
@Get('org/:orgId/inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission(OrgPermission.CAN_VIEW_ORG_INVENTORY)
async getOrgInventory(
  @Param('orgId') orgId: number,
  @Request() req: any,
) {
  // User is guaranteed to have can_view_org_inventory permission
  return this.inventoryService.findByOrg(orgId);
}
```

### Checking Permission in Service

```typescript
const hasPermission = await this.permissionsService.hasPermission(
  userId,
  orgId,
  OrgPermission.CAN_EDIT_ORG_INVENTORY,
);

if (!hasPermission) {
  throw new ForbiddenException('Cannot edit organization inventory');
}
```

### Multiple Permissions (ALL required)

```typescript
@Post('org/:orgId/inventory/bulk-import')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission(
  OrgPermission.CAN_EDIT_ORG_INVENTORY,
  OrgPermission.CAN_ADMIN_ORG_INVENTORY,
)
async bulkImport(@Param('orgId') orgId: number, @Body() data: any) {
  // User must have BOTH permissions
  return this.inventoryService.bulkImport(orgId, data);
}
```

## Error Responses

### 403 Forbidden - Missing Permission

```json
{
  "statusCode": 403,
  "message": "Missing required permissions: can_edit_org_inventory",
  "error": "Forbidden"
}
```

### 400 Bad Request - Missing Org ID

```json
{
  "statusCode": 400,
  "message": "Organization ID required for permission check",
  "error": "Bad Request"
}
```

## Security Considerations

1. **Principle of Least Privilege**: Assign minimum permissions needed for role
2. **Defense in Depth**: Check permissions at both controller AND service layers
3. **Audit Logging**: Log all permission changes and access denials
4. **Cache Invalidation**: Always invalidate cache when roles/permissions change
5. **Organization Context**: Always verify user is member of organization before checking permissions

## Testing

Permission tests should cover:

- ✅ User with permission can access endpoint
- ✅ User without permission receives 403
- ✅ User not in organization receives 403
- ✅ Unauthenticated user receives 401
- ✅ Missing orgId returns 400
- ✅ Permission caching works correctly
- ✅ Cache invalidation works on role changes
