# Organization vs User Inventory: Architecture and Design

## Overview

The Station inventory system uses two distinct models to handle different ownership scenarios:

1. **User Inventory** (`user_inventory_items`) - Items owned by individual users that can optionally be shared with organizations for visibility
2. **Organization Inventory** (`org_inventory_items`) - Items fully owned and managed by organizations

This document explains the distinction, use cases, and future transfer workflow design.

---

## Key Differences

### User Inventory (`user_inventory_items`)

**Purpose**: Track items owned by individual users with optional organization visibility

**Key Fields**:

- `user_id` - The owner of the item
- `shared_org_id` - Optional: Organization the item is shared with for visibility
- When `shared_org_id` is set, org members can VIEW the item but the user retains full ownership

**Use Cases**:

- Personal player inventory tracking
- Ship ownership where user wants to show their fleet to org
- Resource tracking where user contributes visibility but maintains control
- Temporary org access without transferring ownership

**Permissions**:

- User has full control (view, edit, delete)
- If shared with org, org members with `inventory.view` can see it
- Org members CANNOT modify user-owned items (read-only visibility)

**Example Flow**:

```
User Alice owns a Carrack ship
Alice shares it with "Mining Corp" org
Mining Corp members can see Alice owns a Carrack
Alice can unshare at any time
If Alice leaves the org, sharing is auto-revoked via trigger
```

### Organization Inventory (`org_inventory_items`)

**Purpose**: Track items fully owned and controlled by the organization

**Key Fields**:

- `org_id` - The organization that owns the item
- `added_by` / `modified_by` - Which org member created/edited (for accountability)
- NO `shared_org_id` field - org owns it outright

**Use Cases**:

- Org-purchased ships and equipment
- Pooled resources contributed by members (after transfer)
- Org base inventory and stockpiles
- Fleet management where org owns the assets

**Permissions**:

- Org members with `inventory.manage` can create, edit, delete
- Org members with `inventory.view` can see all org inventory
- Individual users have NO access unless they're org members

**Example Flow**:

```
"Mining Corp" purchases a Prospector using org funds
Org treasurer creates org inventory item
All org members with inventory.view can see it
Only members with inventory.manage can modify it
Item persists even if members leave the org
```

---

## Comparison Table

| Feature      | User Inventory              | Org Inventory                       |
| ------------ | --------------------------- | ----------------------------------- |
| Owner        | Individual User             | Organization                        |
| Sharing      | Optional (read-only to org) | N/A (org owns it)                   |
| Edit Access  | User only                   | Org members with `inventory.manage` |
| View Access  | User + shared org (if set)  | Org members with `inventory.view`   |
| Persistence  | Tied to user account        | Tied to organization                |
| Transfer     | Future: User → Org          | Future: Org → User or Org → Org     |
| Added By     | User (self)                 | Org member (tracked)                |
| Auto-unshare | Yes (when user leaves org)  | N/A                                 |

---

## Future Transfer Workflow Design (Post-MVP)

### User → Organization Transfer

Allows users to transfer ownership of their items to an organization.

**Workflow**:

1. User creates transfer request specifying item and org
2. Org admin with `inventory.manage` reviews request
3. If approved:
   - Original `user_inventory_item` soft-deleted OR quantity reduced
   - New `org_inventory_item` created with same item/location
   - Transfer logged in `inventory_audit_log`
   - Both user and org admins notified

**Transfer Request Model** (placeholder):

```typescript
interface InventoryTransferRequest {
  id: string;
  from_user_id: string;
  to_org_id: string;
  user_inventory_item_id: string;
  quantity: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requested_at: Date;
  approved_by?: string;
  approved_at?: Date;
  notes?: string;
}
```

**Validation Rules**:

- User must be member of target org
- User must own the item (not already transferred)
- Quantity must not exceed available quantity
- Transfer must be approved by org admin with `inventory.manage`

**Audit Trail**:

```json
{
  "action": "INVENTORY_TRANSFER",
  "from_user_id": 123,
  "to_org_id": 456,
  "item_id": "abc-123",
  "quantity": 100,
  "approved_by": 789,
  "timestamp": "2025-12-05T10:00:00Z"
}
```

### Organization → User Transfer

Allows orgs to distribute items to members.

**Workflow**:

1. Org admin with `inventory.manage` creates transfer to user
2. User receives notification
3. User accepts or rejects
4. If accepted:
   - `org_inventory_item` soft-deleted OR quantity reduced
   - New `user_inventory_item` created
   - Transfer logged in audit trail

**Use Cases**:

- Rewarding members with org-owned items
- Distributing supplies for missions
- Gifting items to departing members

---

## Auto-Unshare on Member Removal

When a user leaves an organization (via `user_organization_role` deletion):

**User Inventory Behavior**:

- Database trigger automatically sets `shared_org_id = NULL`
- Item remains in user's inventory
- Org loses visibility immediately

**Org Inventory Behavior**:

- No automatic changes (org owns the items)
- User loses access to org inventory immediately via permissions
- User cannot take org items with them

**Implementation**: See `AddAutoUnshareInventoryTrigger` migration

---

## Permission Definitions

### `inventory.view`

- View user inventory items shared with org
- View all org inventory items

### `inventory.manage`

- Create, update, delete org inventory items
- Approve user → org transfers (future)
- Cannot modify user-owned items (even if shared)

### `inventory.admin` (future)

- All `inventory.manage` permissions
- Approve org → user transfers
- Manage inventory policies
- View full audit logs

---

## Database Schema Highlights

### User Inventory Table

```sql
CREATE TABLE user_inventory_items (
  id UUID PRIMARY KEY,
  user_id BIGINT REFERENCES user(id),
  shared_org_id INTEGER REFERENCES organization(id), -- Optional sharing
  -- ... other fields
);
```

### Org Inventory Table

```sql
CREATE TABLE org_inventory_items (
  id UUID PRIMARY KEY,
  org_id INTEGER REFERENCES organization(id), -- Full ownership
  added_by BIGINT REFERENCES user(id), -- Accountability
  modified_by BIGINT REFERENCES user(id),
  -- ... other fields
  -- NO shared_org_id field!
);
```

---

## API Endpoints

### User Inventory

- `GET /user-inventory` - Get my inventory
- `POST /user-inventory` - Add item to my inventory
- `PUT /user-inventory/:id/share` - Share with org (set `shared_org_id`)
- `PUT /user-inventory/:id/unshare` - Unshare from org

### Org Inventory

- `GET /org-inventory/org/:orgId/game/:gameId` - Get org inventory (requires `inventory.view`)
- `POST /org-inventory` - Add item to org inventory (requires `inventory.manage`)
- `PUT /org-inventory/:id` - Update org item (requires `inventory.manage`)
- `DELETE /org-inventory/:id` - Soft delete org item (requires `inventory.manage`)

---

## Migration Path

For existing deployments:

1. **Phase 1 (Current)**: User inventory with sharing
2. **Phase 2 (Issue #19)**: Org inventory schema
3. **Phase 3 (Future)**: Transfer workflow
4. **Phase 4 (Future)**: Org → Org transfers for alliances

No data migration needed - both systems coexist independently.

---

## Testing Considerations

### User Inventory Tests

- Sharing/unsharing behavior
- Auto-unshare on org removal
- Permission checks for shared visibility
- User retains full control of shared items

### Org Inventory Tests

- Permission checks for view/manage
- Org ownership scenarios
- Org member add/remove doesn't affect org items
- Audit trail for accountability

### Transfer Tests (Future)

- Request/approve workflow
- Quantity validation
- Audit logging
- Notification delivery
- Rollback on failure

---

## Summary

**User Inventory** = "I own this, but I'll let the org see it"
**Org Inventory** = "The org owns this, and I'm managing it on behalf of the org"

This separation ensures:

- Clear ownership boundaries
- Proper permission enforcement
- Future transfer capability
- Audit trail accountability
- User privacy and control
