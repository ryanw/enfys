export default {
	"globals": {
		"PRODUCTION": true,
	},
	"roots": [
		"<rootDir>/src",
	],
	"transform": {
		"^.+\\.tsx?$": "ts-jest"
	},
	"testEnvironment": "jsdom",
	"setupFilesAfterEnv": ["jest-extended/all"],
};
