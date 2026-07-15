import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class LlmGraphApi implements ICredentialType {
	name = 'llmGraphApi';

	displayName = 'LLMGraph API';

	icon: Icon = {
		light: 'file:../nodes/LlmGraph/llmgraph.svg',
		dark: 'file:../nodes/LlmGraph/llmgraph.dark.svg',
	};

	documentationUrl = 'https://www.npmjs.com/package/n8n-nodes-llmgraph';

	properties: INodeProperties[] = [
		{
			displayName: 'Deployment Endpoint URL',
			name: 'endpointUrl',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'https://llmgraph.ai/api/your-graph-id/production',
			description:
				'The full deployment endpoint URL, copied from the deployment page in the LLMGraph dashboard',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'The API key for the deployment, copied from the LLMGraph dashboard',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-api-key': '={{$credentials.apiKey}}',
			},
		},
	};

	// Deployments only expose POST, so the test performs a real workflow
	// invocation with an empty JSON body. Declarative test rules can only
	// customize failure messages, so a 422 (request authenticated, workflow
	// rejected the empty input) surfaces the explanatory message below rather
	// than a green check. 401 and 404 mean the credentials are wrong.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.endpointUrl}}',
			url: '',
			method: 'POST',
			body: {},
			json: true,
		},
		rules: [
			{
				type: 'responseCode',
				properties: {
					value: 422,
					message:
						'Credentials accepted: the test invocation authenticated, and the workflow only rejected the empty test input. Save the credential and run the node with real input.',
				},
			},
		],
	};
}
