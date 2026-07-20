/*
 * Copyright 2026 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Sidebar, SidebarItem } from '@backstage/core-components';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { NavContentBlueprint } from '@backstage/plugin-app-react';

import { AuthorizedRbacNavItem } from './AuthorizedRbacNavItem';

const RBAC_PAGE_EXTENSION_ID = 'page:rbac';

/**
 * Nav content that keeps discovered page nav items, but gates the RBAC entry
 * behind a conditional authorize API call instead of an `if` predicate.
 *
 * @alpha
 */
export const rbacNavContent = NavContentBlueprint.make({
  name: 'rbac-authorized',
  params: {
    component: ({ navItems }) => {
      const nav = navItems.withComponent(item =>
        item.node.spec.id === RBAC_PAGE_EXTENSION_ID ? (
          <AuthorizedRbacNavItem
            href={item.href}
            title={item.title}
            icon={item.icon}
          />
        ) : (
          <SidebarItem
            icon={() => item.icon}
            to={item.href}
            text={item.title}
          />
        ),
      );

      return <Sidebar>{nav.rest()}</Sidebar>;
    },
  },
});

/**
 * App module that installs auth-aware RBAC nav gating.
 *
 * Install alongside the RBAC frontend plugin:
 *
 * ```ts
 * features: [rbacPlugin, rbacNavModule]
 * ```
 *
 * @alpha
 */
export const rbacNavModule = createFrontendModule({
  pluginId: 'app',
  extensions: [rbacNavContent],
});
