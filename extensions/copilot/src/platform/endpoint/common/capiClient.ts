/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CAPIClient, MakeRequestOptions, RequestMetadata, RequestType } from '@vscode/copilot-api';
import { createServiceIdentifier } from '../../../util/common/services';
import { IEnvService, getEditorVersionHeaders } from '../../env/common/envService';
import { IFetcherService, NO_FETCH_TELEMETRY } from '../../networking/common/fetcherService';
import { LICENSE_AGREEMENT } from './licenseAgreement';

/**
 * Interface for CAPI client service
 */
export interface ICAPIClientService extends CAPIClient {
	readonly _serviceBrand: undefined;
	abExpContext: string | undefined;
}

export abstract class BaseCAPIClientService extends CAPIClient implements ICAPIClientService {
	readonly _serviceBrand: undefined;
	public abExpContext: string | undefined;

	constructor(
		hmac: string | undefined,
		integrationId: string | undefined,
		fetcherService: IFetcherService,
		private readonly _envService: IEnvService
	) {
		super({
			machineId: _envService.machineId,
			deviceId: _envService.devDeviceId,
			sessionId: _envService.sessionId,
			vscodeVersion: _envService.vscodeVersion,
			buildType: _envService.getBuildType(),
			name: _envService.getName(),
			version: _envService.getVersion(),
		}, LICENSE_AGREEMENT, fetcherService, hmac, integrationId);
	}

	override makeRequest<T>(request: MakeRequestOptions, requestMetadata: RequestMetadata): Promise<T> {
		if (!request.headers) {
			request.headers = {};
		}
		// The @vscode/copilot-api mixin (`_mixinHeaders`) only stamps editor identity headers for its
		// allow-listed request types and silently skips `Proxy*` types (used by xtab/NES). Inject them
		// here so they are present before dispatch. For allow-listed types the mixin overrides these
		// with `vscode/<version>`; for `Proxy*` types the mixin early-returns and the real editor
		// identity survives.
		Object.assign(request.headers, getEditorVersionHeaders(this._envService));

		// Inject AB Exp Context headers (legacy VScode-ABExpContext and new standardized X-Copilot-Client-Exp-Assignment-Context) if available
		if (this.abExpContext) {
			request.headers['VScode-ABExpContext'] = this.abExpContext;
			request.headers['X-Copilot-Client-Exp-Assignment-Context'] = this.abExpContext;
		}
		// Expected high request volume events that we don't need to collect fetch telemetry for
		if (
			requestMetadata.type === RequestType.Telemetry ||
			requestMetadata.type === RequestType.ChatCompletions ||
			requestMetadata.type === RequestType.ChatMessages ||
			requestMetadata.type === RequestType.ChatResponses
		) {
			request.callSite = NO_FETCH_TELEMETRY;
		}
		return super.makeRequest<T>(request, requestMetadata);
	}
}
export const ICAPIClientService = createServiceIdentifier<ICAPIClientService>('ICAPIClientService');