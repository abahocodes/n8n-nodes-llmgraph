import type { IAuthenticateGeneric, ICredentialType, Icon, INodeProperties } from 'n8n-workflow';

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

	// The credential test lives on the node as methods.credentialTest
	// (llmGraphApiTest, wired via testedBy in the node description), because
	// deciding that HTTP 422 still means a valid credential needs logic that a
	// declarative test request cannot express.
}
