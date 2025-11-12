export interface NameMetadata {
	name: string;
	description: string;
	image: string;
	attributes: {
		trait_type: string;
		value: number | string;
		display_type: string;
	}[];
}
