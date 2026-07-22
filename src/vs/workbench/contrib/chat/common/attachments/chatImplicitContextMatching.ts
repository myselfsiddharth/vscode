/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { isEqual } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { IRange, Range } from '../../../../../editor/common/core/range.js';
import { isLocation } from '../../../../../editor/common/languages.js';
import { IChatRequestVariableEntry, isStringVariableEntry } from './chatVariableEntries.js';

export interface IImplicitContextAttachmentTarget {
	readonly uri?: URI;
	readonly range?: IRange;
	readonly handle?: number;
	readonly resourceUri?: URI;
}

/**
 * Whether an implicit context suggestion should be hidden because the same
 * attachment is already in the chat input attachment model.
 */
export function isImplicitContextAlreadyAttached(
	attachments: readonly IChatRequestVariableEntry[],
	target: IImplicitContextAttachmentTarget,
): boolean {
	const { uri: targetUri, range: targetRange, handle: targetHandle, resourceUri: targetResourceUri } = target;

	return attachments.some(a => {
		if (targetHandle !== undefined && isStringVariableEntry(a) && a.handle === targetHandle) {
			return true;
		}

		// String/PR attachments store text in `value` and identity on `resourceUri`.
		// Their `uri` is the editor/webview resource, so it must not hide file suggestions.
		if (isStringVariableEntry(a)) {
			if (targetResourceUri && a.resourceUri && isEqual(targetResourceUri, a.resourceUri)) {
				return true;
			}
			// Fallback when the target is also string-shaped (has a handle) but no resourceUri.
			if (targetHandle !== undefined && targetUri && a.uri && isEqual(targetUri, a.uri)) {
				return true;
			}
			return false;
		}

		const aUri = URI.isUri(a.value) ? a.value : isLocation(a.value) ? a.value.uri : undefined;
		const aRange = isLocation(a.value) ? a.value.range : undefined;
		if (targetUri && aUri && isEqual(targetUri, aUri)) {
			if (targetRange && aRange) {
				return Range.equalsRange(targetRange, aRange);
			}
			return !targetRange && !aRange;
		}
		return false;
	});
}
