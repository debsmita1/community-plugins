---
'@backstage-community/plugin-rbac': minor
---

Hide the RBAC sidebar item unless the signed-in user is authorized via the RBAC backend. Install `rbacNavModule` alongside the plugin (or use `AuthorizedRbacNavItem` in custom nav content) so resource-based `policy.entity.read` checks work without relying on extension `if` predicates.
