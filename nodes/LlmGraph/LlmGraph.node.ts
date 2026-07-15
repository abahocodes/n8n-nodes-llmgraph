import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	IExecuteFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { jsonParse, NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

const ERROR_MESSAGES: Record<number, string> = {
	400: 'LLMGraph rejected the request body as invalid JSON',
	401: 'Authentication failed, check the API key and deployment endpoint URL',
	402: 'The LLMGraph account that owns this deployment has a billing issue',
	403: 'This deployment is disabled',
	404: 'Deployment not found, check the deployment endpoint URL',
	422: 'The workflow run failed',
	429: 'Rate limit exceeded, retry later',
	504: 'The workflow run timed out',
};

function extractStatusCode(error: unknown): number | undefined {
	const candidate = error as {
		statusCode?: number;
		httpCode?: string;
		response?: { status?: number; statusCode?: number };
	};
	const status =
		candidate.statusCode ??
		candidate.response?.status ??
		candidate.response?.statusCode ??
		Number(candidate.httpCode);
	return Number.isFinite(status) ? status : undefined;
}

// Pulls the server-produced error detail out of the response body carried by
// the raw error, without touching request config or headers. LLMGraph error
// bodies expose the failure detail in error/reason/kind fields.
function extractResponseDetail(error: unknown): string | undefined {
	const candidate = error as {
		error?: unknown;
		response?: { data?: unknown; body?: unknown };
		cause?: { response?: { data?: unknown; body?: unknown } };
	};
	const body =
		candidate.response?.data ??
		candidate.response?.body ??
		candidate.cause?.response?.data ??
		candidate.cause?.response?.body ??
		candidate.error;

	if (typeof body === 'string' && body !== '') {
		return body;
	}
	if (body === null || typeof body !== 'object') {
		return undefined;
	}

	const record = body as Record<string, unknown>;
	const nested =
		record.error !== null && typeof record.error === 'object'
			? (record.error as Record<string, unknown>)
			: {};
	return [record.error, record.reason, record.kind, nested.reason, nested.kind, nested.message].find(
		(value): value is string => typeof value === 'string' && value !== '',
	);
}

export class LlmGraph implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LLMGraph',
		name: 'llmGraph',
		icon: { light: 'file:llmgraph.svg', dark: 'file:llmgraph.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: 'Invoke Workflow',
		description: 'Invoke workflows deployed on LLMGraph',
		defaults: {
			name: 'LLMGraph',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'llmGraphApi',
				required: true,
				testedBy: 'llmGraphApiTest',
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Invoke Workflow',
						value: 'invokeWorkflow',
						action: 'Invoke a deployed workflow',
						description:
							'Send a JSON payload to a deployed LLMGraph workflow and return its output',
					},
				],
				default: 'invokeWorkflow',
			},
			{
				displayName: 'Request Body',
				name: 'body',
				type: 'json',
				default: '{}',
				description: 'JSON object sent as the request body of the workflow invocation',
				displayOptions: {
					show: {
						operation: ['invokeWorkflow'],
					},
				},
			},
			{
				displayName: 'User Input',
				name: 'userInput',
				type: 'string',
				default: '',
				description:
					'Convenience field, when set it is merged into the request body as the user_input property',
				displayOptions: {
					show: {
						operation: ['invokeWorkflow'],
					},
				},
			},
		],
	};

	methods = {
		credentialTest: {
			// LLMGraph deployments only expose POST, so the test performs a real
			// workflow invocation with an empty JSON body. A 422 means the request
			// authenticated and the workflow ran but failed on the empty input, so
			// the credential itself is valid.
			async llmGraphApiTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const { endpointUrl, apiKey } = credential.data as {
					endpointUrl: string;
					apiKey: string;
				};

				try {
					// eslint-disable-next-line @n8n/community-nodes/no-deprecated-workflow-functions -- ICredentialTestFunctions only exposes the request helper; httpRequest is not available in the credential test context
					await this.helpers.request({
						method: 'POST',
						uri: endpointUrl,
						headers: { 'x-api-key': apiKey },
						body: {},
						json: true,
					});
				} catch (error) {
					const statusCode = extractStatusCode(error);

					if (statusCode === 422) {
						return {
							status: 'OK',
							message:
								'Authentication successful. The test run reported a workflow failure, which is expected when the workflow requires input.',
						};
					}

					if (statusCode !== undefined) {
						return {
							status: 'Error',
							message:
								ERROR_MESSAGES[statusCode] ??
								`The deployment endpoint returned HTTP ${statusCode}`,
						};
					}

					return {
						status: 'Error',
						message: `Could not reach the deployment endpoint: ${(error as Error).message}`,
					};
				}

				return { status: 'OK', message: 'Authentication successful' };
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('llmGraphApi');
		const endpointUrl = credentials.endpointUrl as string;

		for (let i = 0; i < items.length; i++) {
			try {
				const rawBody = this.getNodeParameter('body', i, '{}') as string | IDataObject;
				const parsedBody =
					typeof rawBody === 'string'
						? jsonParse<IDataObject>(rawBody === '' ? '{}' : rawBody, {
								errorMessage: 'Request Body must be valid JSON',
							})
						: rawBody;

				if (parsedBody === null || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
					throw new NodeOperationError(this.getNode(), 'Request Body must be a JSON object', {
						itemIndex: i,
					});
				}

				const body: IDataObject = { ...parsedBody };
				const userInput = this.getNodeParameter('userInput', i, '') as string;
				if (userInput !== '') {
					body.user_input = userInput;
				}

				const response: unknown = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'llmGraphApi',
					{
						method: 'POST',
						url: endpointUrl,
						body,
						json: true,
					},
				);

				const json: IDataObject =
					response !== null && typeof response === 'object' && !Array.isArray(response)
						? (response as IDataObject)
						: { output: response as IDataObject['output'] };

				returnData.push({ json, pairedItem: { item: i } });
			} catch (error) {
				const statusCode = extractStatusCode(error);
				const detail = extractResponseDetail(error);
				const message =
					statusCode !== undefined
						? (ERROR_MESSAGES[statusCode] ?? 'The LLMGraph request failed')
						: (error as Error).message;

				if (this.continueOnFail()) {
					// Message-only error data: the raw error object must never be
					// pushed into items because its cause chain carries the request
					// config, including the x-api-key header.
					returnData.push({
						json: detail !== undefined ? { error: message, detail } : { error: message },
						pairedItem: { item: i },
					});
					continue;
				}

				if (statusCode !== undefined) {
					// Build a sanitized error object from scratch so that request
					// details, including credentials, never end up in error output.
					// Only the server-produced response detail is carried over.
					const details: JsonObject = { message, httpCode: String(statusCode) };
					if (detail !== undefined) {
						details.description = detail;
					}
					throw new NodeApiError(this.getNode(), details, {
						message,
						description: detail,
						itemIndex: i,
					});
				}

				// Pass only the message string, never the raw error object: n8n does
				// not scrub it, and its cause chain carries the request config,
				// including the x-api-key header.
				throw new NodeOperationError(this.getNode(), (error as Error).message, {
					itemIndex: i,
				});
			}
		}

		return [returnData];
	}
}
