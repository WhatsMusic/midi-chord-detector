import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Wir lassen Turbopack unangetastet und nutzen nur Webpack

	webpack(config, { webpack }) {
		// 0) Alles aus node-pre-gyp, aws-sdk, mock-aws-s3, nock mit Null-Loader stubben
		config.module.rules.unshift({
			test: /node_modules\/@mapbox\/node-pre-gyp\/.*\.(html|js)$/,
			use: "null-loader"
		});
		config.module.rules.unshift({
			test: /(aws-sdk|mock-aws-s3|nock)/,
			use: "null-loader"
		});

		// 1) Alle übrigen .html-Dateien mit raw-loader als Text laden
		config.module.rules.push({
			test: /\.html$/,
			use: "raw-loader"
			// raw-loader braucht keine Optionen hier
		});

		// 2) Für alle node-pre-gyp-Im-/Exports komplett ignorieren
		config.plugins.push(
			new webpack.IgnorePlugin({
				resourceRegExp: /^@mapbox\/node-pre-gyp$/
			})
		);

		// 3) Fallback für aws-pakete (falls irgendwo doch ein require auftaucht)
		config.resolve.fallback = {
			...config.resolve.fallback,
			"aws-sdk": false,
			"mock-aws-s3": false,
			nock: false
		};

		return config;
	}
};

export default nextConfig;
