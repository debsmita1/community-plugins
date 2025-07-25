/*
 * Copyright 2021 The Backstage Authors
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
  azureDevOpsGitTagReadPermission,
  azureDevOpsPipelineReadPermission,
  azureDevOpsPullRequestDashboardReadPermission,
  azureDevOpsPullRequestReadPermission,
  DashboardPullRequest,
  PullRequestOptions,
  PullRequestStatus,
} from '@backstage-community/plugin-azure-devops-common';

import { AzureDevOpsApi } from '../api';
import { Config } from '@backstage/config';
import {
  DEFAULT_TEAMS_LIMIT,
  PullRequestsDashboardProvider,
} from '../api/PullRequestsDashboardProvider';
import Router from 'express-promise-router';
import { UrlReaderService } from '@backstage/backend-plugin-api';
import express from 'express';
import { InputError, NotAllowedError } from '@backstage/errors';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import {
  HttpAuthService,
  LoggerService,
  PermissionsService,
} from '@backstage/backend-plugin-api';
import { MiddlewareFactory } from '@backstage/backend-defaults/rootHttpRouter';

const DEFAULT_TOP = 10;

/**
 * @internal
 * */
export interface RouterOptions {
  azureDevOpsApi?: AzureDevOpsApi;
  logger: LoggerService;
  config: Config;
  reader: UrlReaderService;
  permissions: PermissionsService;
  httpAuth: HttpAuthService;
}

/**
 * @internal
 * */
export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, reader, config, permissions, httpAuth } = options;

  const azureDevOpsApi =
    options.azureDevOpsApi ||
    AzureDevOpsApi.fromConfig(config, { logger, urlReader: reader });

  const pullRequestsDashboardProvider =
    await PullRequestsDashboardProvider.create(logger, azureDevOpsApi);

  const router = Router();
  router.use(express.json());

  router.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  router.get('/projects', async (_req, res) => {
    const projects = await azureDevOpsApi.getProjects();
    res.status(200).json(projects);
  });

  router.get('/repository/:projectName/:repoName', async (req, res) => {
    const { projectName, repoName } = req.params;
    const gitRepository = await azureDevOpsApi.getGitRepository(
      projectName,
      repoName,
    );
    res.status(200).json(gitRepository);
  });

  router.get('/builds/:projectName/:repoId', async (req, res) => {
    const { projectName, repoId } = req.params;
    const top = req.query.top ? Number(req.query.top) : DEFAULT_TOP;
    const host = req.query.host?.toString();
    const org = req.query.org?.toString();
    const buildList = await azureDevOpsApi.getBuildList(
      projectName,
      repoId,
      top,
      host,
      org,
    );
    res.status(200).json(buildList);
  });

  /**
   * @deprecated This method has no usages and will be removed in a future release
   */
  router.get('/repo-builds/:projectName/:repoName', async (req, res) => {
    const { projectName, repoName } = req.params;

    const top = req.query.top ? Number(req.query.top) : DEFAULT_TOP;
    const host = req.query.host?.toString();
    const org = req.query.org?.toString();
    const gitRepository = await azureDevOpsApi.getRepoBuilds(
      projectName,
      repoName,
      top,
      host,
      org,
    );

    res.status(200).json(gitRepository);
  });

  router.get('/git-tags/:projectName/:repoName', async (req, res) => {
    const { projectName, repoName } = req.params;
    const host = req.query.host?.toString();
    const org = req.query.org?.toString();

    const entityRef = req.query.entityRef;
    if (typeof entityRef !== 'string') {
      throw new InputError('Invalid entityRef, not a string');
    }

    const decision = (
      await permissions.authorize(
        [
          {
            permission: azureDevOpsGitTagReadPermission,
            resourceRef: entityRef,
          },
        ],
        { credentials: await httpAuth.credentials(req) },
      )
    )[0];

    if (decision.result === AuthorizeResult.DENY) {
      throw new NotAllowedError('Unauthorized');
    }

    const gitTags = await azureDevOpsApi.getGitTags(
      projectName,
      repoName,
      host,
      org,
    );
    res.status(200).json(gitTags);
  });

  router.get('/pull-requests/:projectName/:repoName', async (req, res) => {
    const { projectName, repoName } = req.params;

    const top = req.query.top ? Number(req.query.top) : DEFAULT_TOP;
    const teamsLimit = req.query.teamsLimit
      ? Number(req.query.teamsLimit)
      : DEFAULT_TEAMS_LIMIT;
    const host = req.query.host?.toString();
    const org = req.query.org?.toString();
    const status = req.query.status
      ? Number(req.query.status)
      : PullRequestStatus.Active;

    const pullRequestOptions: PullRequestOptions = {
      top: top,
      status: status,
      teamsLimit: teamsLimit,
    };

    const entityRef = req.query.entityRef;
    if (typeof entityRef !== 'string') {
      throw new InputError('Invalid entityRef, not a string');
    }

    const decision = (
      await permissions.authorize(
        [
          {
            permission: azureDevOpsPullRequestReadPermission,
            resourceRef: entityRef,
          },
        ],
        { credentials: await httpAuth.credentials(req) },
      )
    )[0];

    if (decision.result === AuthorizeResult.DENY) {
      throw new NotAllowedError('Unauthorized');
    }

    const gitPullRequest = await azureDevOpsApi.getPullRequests(
      projectName,
      repoName,
      pullRequestOptions,
      host,
      org,
    );

    res.status(200).json(gitPullRequest);
  });

  router.get('/dashboard-pull-requests/:projectName', async (req, res) => {
    const { projectName } = req.params;

    const top = req.query.top ? Number(req.query.top) : DEFAULT_TOP;
    const teamsLimit = req.query.teamsLimit
      ? Number(req.query.teamsLimit)
      : DEFAULT_TEAMS_LIMIT;

    const status = req.query.status
      ? Number(req.query.status)
      : PullRequestStatus.Active;

    const pullRequestOptions: PullRequestOptions = {
      top: top,
      status: status,
      teamsLimit: teamsLimit,
    };

    const decision = (
      await permissions.authorize(
        [
          {
            permission: azureDevOpsPullRequestDashboardReadPermission,
          },
        ],
        { credentials: await httpAuth.credentials(req) },
      )
    )[0];

    if (decision.result === AuthorizeResult.DENY) {
      throw new NotAllowedError('Unauthorized');
    }

    const pullRequests: DashboardPullRequest[] =
      await pullRequestsDashboardProvider.getDashboardPullRequests(
        projectName,
        pullRequestOptions,
      );

    res.status(200).json(pullRequests);
  });

  router.get('/all-teams', async (req, res) => {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const allTeams = await pullRequestsDashboardProvider.getAllTeams({ limit });
    res.status(200).json(allTeams);
  });

  /**
   * @deprecated This method has no usages and will be removed in a future release
   */
  router.get(
    '/build-definitions/:projectName/:definitionName',
    async (req, res) => {
      const { projectName, definitionName } = req.params;
      const host = req.query.host?.toString();
      const org = req.query.org?.toString();
      const buildDefinitionList = await azureDevOpsApi.getBuildDefinitions(
        projectName,
        definitionName,
        host,
        org,
      );
      res.status(200).json(buildDefinitionList);
    },
  );

  router.get('/builds/:projectName', async (req, res) => {
    const { projectName } = req.params;
    const repoName = req.query.repoName?.toString();
    const definitionName = req.query.definitionName?.toString();
    const top = req.query.top ? Number(req.query.top) : DEFAULT_TOP;
    const host = req.query.host?.toString();
    const org = req.query.org?.toString();

    const entityRef = req.query.entityRef;
    if (typeof entityRef !== 'string') {
      throw new InputError('Invalid entityRef, not a string');
    }

    const decision = (
      await permissions.authorize(
        [
          {
            permission: azureDevOpsPipelineReadPermission,
            resourceRef: entityRef,
          },
        ],
        { credentials: await httpAuth.credentials(req) },
      )
    )[0];

    if (decision.result === AuthorizeResult.DENY) {
      throw new NotAllowedError('Unauthorized');
    }

    const builds = await azureDevOpsApi.getBuildRuns(
      projectName,
      top,
      repoName,
      definitionName,
      host,
      org,
    );
    res.status(200).json(builds);
  });

  router.get('/users/:userId/team-ids', async (req, res) => {
    const { userId } = req.params;
    const teamIds = await pullRequestsDashboardProvider.getUserTeamIds(userId);
    res.status(200).json(teamIds);
  });

  router.get('/readme/:projectName/:repoName', async (req, res) => {
    const host =
      req.query.host?.toString() ?? config.getString('azureDevOps.host');
    const org =
      req.query.org?.toString() ?? config.getString('azureDevOps.organization');
    let path = req.query.path;

    if (path === undefined) {
      // if the annotation is missing, default to the previous behaviour (look for README.md in the root of the repo)
      path = 'README.md';
    }

    if (typeof path !== 'string') {
      throw new InputError('Invalid path param');
    }

    if (path === '') {
      throw new InputError('If present, the path param should not be empty');
    }

    const { projectName, repoName } = req.params;

    const entityRef = req.query.entityRef;
    if (typeof entityRef !== 'string') {
      throw new InputError('Invalid entityRef, not a string');
    }

    const decision = (
      await permissions.authorize(
        [
          {
            permission: azureDevOpsPullRequestReadPermission,
            resourceRef: entityRef,
          },
        ],
        { credentials: await httpAuth.credentials(req) },
      )
    )[0];

    if (decision.result === AuthorizeResult.DENY) {
      throw new NotAllowedError('Unauthorized');
    }

    const readme = await azureDevOpsApi.getReadme(
      host,
      org,
      projectName,
      repoName,
      path,
    );
    res.status(200).json(readme);
  });

  router.get('/builds/:projectName/build/:buildId/log', async (req, res) => {
    const { projectName } = req.params;
    const buildId = Number(req.params.buildId);
    const host = req.query.host?.toString();
    const org = req.query.org?.toString();

    if (isNaN(buildId)) {
      throw new InputError('Invalid buildId parameter');
    }

    const entityRef = req.query.entityRef;
    if (typeof entityRef !== 'string') {
      throw new InputError('Invalid entityRef, not a string');
    }

    const decision = (
      await permissions.authorize(
        [
          {
            permission: azureDevOpsPipelineReadPermission,
            resourceRef: entityRef,
          },
        ],
        { credentials: await httpAuth.credentials(req) },
      )
    )[0];

    if (decision.result === AuthorizeResult.DENY) {
      throw new NotAllowedError('Unauthorized');
    }

    const logForBuild = await azureDevOpsApi.getBuildRunLog(
      projectName,
      Number(buildId),
      host,
      org,
    );

    res.status(200).json({ log: logForBuild });
  });

  const middleware = MiddlewareFactory.create({ logger, config });

  router.use(middleware.error());
  return router;
}
