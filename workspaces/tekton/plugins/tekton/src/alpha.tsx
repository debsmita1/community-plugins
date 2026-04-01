/*
 * Copyright 2025 The Backstage Authors
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
import {
  createFrontendPlugin,
  createFrontendModule,
} from '@backstage/frontend-plugin-api';
import { EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { TranslationBlueprint } from '@backstage/plugin-app-react';
import { tektonTranslations } from './translations/index.ts';
import {
  kubernetesClustersReadPermission,
  kubernetesResourcesReadPermission,
} from '@backstage/plugin-kubernetes-common';
import { isTektonCIAvailable } from './utils/isTektonCIAvailable.ts';

const tektonEntityContent = EntityContentBlueprint.make({
  name: 'tektonEntityContent',
  params: {
    path: '/ci-cd',
    title: 'CI/CD',
    filter: isTektonCIAvailable,
    loader: () => import('./components/Router').then(m => <m.Router />),
  },
  if: {
    $all: [
      {
        permissions: { $contains: kubernetesResourcesReadPermission.name },
      },
      {
        permissions: { $contains: kubernetesClustersReadPermission.name },
      },
    ],
  },
});

/**
 * Translation module for the Tekton plugin (NFS).
 * @alpha
 */
export const tektonTranslationsModule = createFrontendModule({
  pluginId: 'app',
  extensions: [
    TranslationBlueprint.make({
      name: 'tekton-translations',
      params: {
        resource: tektonTranslations,
      },
    }),
  ],
});

/**
 * The Tekton backstage NFS plugin.
 * @alpha
 */
export default createFrontendPlugin({
  pluginId: 'tekton',
  extensions: [tektonEntityContent],
});
