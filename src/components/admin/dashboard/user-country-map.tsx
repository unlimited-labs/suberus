import { countries } from "countries-list";
import MapLibreGL from "maplibre-gl";
import { useEffect, useMemo, useRef } from "react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import topology from "world-atlas/countries-110m.json";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapControls, Map as MapView, useMap } from "@/components/ui/map";
import { Skeleton } from "@/components/ui/skeleton";
import { ISO_NUMERIC_TO_ALPHA2 } from "@/lib/iso-numeric-to-alpha2";
import type { AdminDashboardMetrics } from "@/utils/admin-dashboard.server";

interface UserCountryMapProps {
	data: AdminDashboardMetrics["usersByCountry"] | undefined;
}

const countryNameToCode = new globalThis.Map<string, string>();
for (const [code, info] of Object.entries(countries)) {
	countryNameToCode.set(info.name, code);
}

const SOURCE_ID = "countries-source";
const FILL_LAYER_ID = "countries-fill";
const LINE_LAYER_ID = "countries-line";

const LEGEND_ITEMS = [
	{ color: "#bfdbfe", label: "1–5" },
	{ color: "#60a5fa", label: "6–20" },
	{ color: "#2563eb", label: "21–50" },
	{ color: "#1e3a8a", label: "50+" },
] as const;

const COLOR_STEPS = {
	none: "transparent",
	low: LEGEND_ITEMS[0].color,
	medium: LEGEND_ITEMS[1].color,
	high: LEGEND_ITEMS[2].color,
	max: LEGEND_ITEMS[3].color,
} as const;

// Static MapLibre expression — colors are known at build time, no need to scan features
const COLOR_EXPRESSION = [
	"match",
	["get", "fillColor"],
	COLOR_STEPS.low,
	COLOR_STEPS.low,
	COLOR_STEPS.medium,
	COLOR_STEPS.medium,
	COLOR_STEPS.high,
	COLOR_STEPS.high,
	COLOR_STEPS.max,
	COLOR_STEPS.max,
	"transparent",
] as unknown as MapLibreGL.ExpressionSpecification;

const MAP_STYLES = {
	light:
		"https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json",
	dark: "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json",
} as const;

const MAP_CENTER: [number, number] = [10, 30];

function getColorForCount(count: number): string {
	if (count <= 0) return COLOR_STEPS.none;
	if (count <= 5) return COLOR_STEPS.low;
	if (count <= 20) return COLOR_STEPS.medium;
	if (count <= 50) return COLOR_STEPS.high;
	return COLOR_STEPS.max;
}

function buildGeoJson(data: AdminDashboardMetrics["usersByCountry"]) {
	const alpha2ToCount = new globalThis.Map<string, number>();
	for (const entry of data) {
		const code = countryNameToCode.get(entry.country);
		if (code) {
			alpha2ToCount.set(code, (alpha2ToCount.get(code) ?? 0) + entry.count);
		}
	}

	const geojson = feature(
		topology as unknown as Topology,
		topology.objects.countries as GeometryCollection,
	) as GeoJSON.FeatureCollection;

	for (const feat of geojson.features) {
		const numericId = feat.id as string;
		const alpha2 = ISO_NUMERIC_TO_ALPHA2[numericId];
		const count = alpha2 ? (alpha2ToCount.get(alpha2) ?? 0) : 0;
		const countryInfo = alpha2
			? countries[alpha2 as keyof typeof countries]
			: undefined;

		feat.properties = {
			...feat.properties,
			alpha2: alpha2 ?? "",
			userCount: count,
			countryName: countryInfo?.name ?? numericId,
			fillColor: getColorForCount(count),
		};
	}

	return geojson;
}

function ChoroplethLayer({
	data,
}: {
	data: AdminDashboardMetrics["usersByCountry"];
}) {
	const { map, isLoaded } = useMap();
	const popupRef = useRef<MapLibreGL.Popup | null>(null);
	const mapRef = useRef(map);
	mapRef.current = map;

	const geojson = useMemo(() => buildGeoJson(data), [data]);

	const geojsonRef = useRef(geojson);
	geojsonRef.current = geojson;

	// Mount: add source, layers, and event handlers
	useEffect(() => {
		if (!isLoaded || !map) return;

		map.addSource(SOURCE_ID, {
			type: "geojson",
			data: geojsonRef.current as GeoJSON.FeatureCollection,
		});

		map.addLayer({
			id: FILL_LAYER_ID,
			type: "fill",
			source: SOURCE_ID,
			paint: {
				"fill-color": COLOR_EXPRESSION,
				"fill-opacity": 0.7,
			},
		});

		map.addLayer({
			id: LINE_LAYER_ID,
			type: "line",
			source: SOURCE_ID,
			paint: {
				"line-color": "#64748b",
				"line-width": 0.8,
			},
		});

		const handleMouseMove = (
			e: MapLibreGL.MapMouseEvent & {
				features?: MapLibreGL.MapGeoJSONFeature[];
			},
		) => {
			const m = mapRef.current;
			if (!m || !e.features?.length) return;

			const feat = e.features[0];
			const name = feat.properties?.countryName as string;
			const count = feat.properties?.userCount as number;

			if (count <= 0) {
				if (popupRef.current) {
					popupRef.current.remove();
					popupRef.current = null;
				}
				m.getCanvas().style.cursor = "";
				return;
			}

			m.getCanvas().style.cursor = "pointer";

			if (!popupRef.current) {
				popupRef.current = new MapLibreGL.Popup({
					closeButton: false,
					closeOnClick: false,
					offset: 10,
				});
			}

			popupRef.current
				.setLngLat(e.lngLat)
				.setHTML(
					`<div style="font-size:13px;font-weight:500;padding:2px 4px">${name}: ${count} ${count === 1 ? "user" : "users"}</div>`,
				)
				.addTo(m);
		};

		const handleMouseLeave = () => {
			const m = mapRef.current;
			if (!m) return;
			m.getCanvas().style.cursor = "";
			if (popupRef.current) {
				popupRef.current.remove();
				popupRef.current = null;
			}
		};

		map.on("mousemove", FILL_LAYER_ID, handleMouseMove);
		map.on("mouseleave", FILL_LAYER_ID, handleMouseLeave);

		return () => {
			map.off("mousemove", FILL_LAYER_ID, handleMouseMove);
			map.off("mouseleave", FILL_LAYER_ID, handleMouseLeave);

			if (popupRef.current) {
				popupRef.current.remove();
				popupRef.current = null;
			}

			try {
				if (map.getLayer(LINE_LAYER_ID)) map.removeLayer(LINE_LAYER_ID);
				if (map.getLayer(FILL_LAYER_ID)) map.removeLayer(FILL_LAYER_ID);
				if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
			} catch {
				// ignore cleanup errors during unmount
			}
		};
	}, [isLoaded, map]);

	// Update source data when data changes (paint uses static COLOR_EXPRESSION)
	useEffect(() => {
		if (!isLoaded || !map) return;

		const source = map.getSource(SOURCE_ID) as MapLibreGL.GeoJSONSource;
		if (source) {
			source.setData(geojson as GeoJSON.FeatureCollection);
		}
	}, [isLoaded, map, geojson]);

	return null;
}

// Static JSX hoisted to module level (rendering-hoist-jsx)
const mapLegend = (
	<div className="absolute bottom-2 left-2 z-10 rounded-md border bg-background/80 p-2 text-xs backdrop-blur-sm">
		<div className="mb-1 font-medium">Users</div>
		<div className="flex flex-col gap-0.5">
			{LEGEND_ITEMS.map(({ color, label }) => (
				<div key={label} className="flex items-center gap-1.5">
					<div
						className="size-3 rounded-sm border border-border/50"
						style={{ backgroundColor: color }}
					/>
					<span>{label}</span>
				</div>
			))}
		</div>
	</div>
);

export function UserCountryMap({ data }: UserCountryMapProps) {
	if (!data) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Users by Country</CardTitle>
				</CardHeader>
				<CardContent>
					<Skeleton className="h-[300px] w-full md:h-[400px]" />
				</CardContent>
			</Card>
		);
	}

	if (data.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Users by Country</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex h-[300px] items-center justify-center md:h-[400px]">
						<p className="text-muted-foreground">No country data available</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Users by Country</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="h-[300px] md:h-[400px]">
					<MapView center={MAP_CENTER} zoom={1.5} styles={MAP_STYLES}>
						<MapControls showZoom showFullscreen position="bottom-right" />
						<ChoroplethLayer data={data} />
						{mapLegend}
					</MapView>
				</div>
			</CardContent>
		</Card>
	);
}
