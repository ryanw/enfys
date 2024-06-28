export function getParam(name: string): string | undefined {
	return window.location.search.match(new RegExp(`(?:\\?|&)${name}=([^&]+)`))?.[1];
}

