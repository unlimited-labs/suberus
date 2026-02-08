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

const COLOR_STEPS = {
	none: "transparent",
	low: "#bfdbfe",
	medium: "#60a5fa",
	high: "#2563eb",
	max: "#1e3a8a",
} as const;

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

function buildColorExpression(
	geojson: ReturnType<typeof buildGeoJson>,
): MapLibreGL.ExpressionSpecification {
	const expr: unknown[] = ["match", ["get", "fillColor"]];
	const uniqueColors = new Set<string>();
	for (const feat of geojson.features) {
		const c = (feat.properties as Record<string, unknown>).fillColor as string;
		if (c && c !== "transparent") uniqueColors.add(c);
	}
	for (const color of uniqueColors) {
		expr.push(color, color);
	}
	expr.push("transparent");
	return expr as unknown as MapLibreGL.ExpressionSpecification;
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
	const colorExpression = useMemo(
		() => buildColorExpression(geojson),
		[geojson],
	);

	const geojsonRef = useRef(geojson);
	geojsonRef.current = geojson;
	const colorExpressionRef = useRef(colorExpression);
	colorExpressionRef.current = colorExpression;

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
				"fill-color": colorExpressionRef.current,
				"fill-opacity": 0.7,
			},
		});

		map.addLayer({
			id: LINE_LAYER_ID,
			type: "line",
			source: SOURCE_ID,
			paint: {
				"line-color": "#94a3b8",
				"line-width": 0.5,
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

	// Update source data and paint when data changes
	useEffect(() => {
		if (!isLoaded || !map) return;

		const source = map.getSource(SOURCE_ID) as MapLibreGL.GeoJSONSource;
		if (source) {
			source.setData(geojson as GeoJSON.FeatureCollection);

			if (map.getLayer(FILL_LAYER_ID)) {
				map.setPaintProperty(FILL_LAYER_ID, "fill-color", colorExpression);
			}
		}
	}, [isLoaded, map, geojson, colorExpression]);

	return null;
}

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
					<MapView
						center={[10, 30]}
						zoom={1.5}
						styles={{
							light: "https://tiles.openfreemap.org/styles/bright",
							dark: "https://tiles.openfreemap.org/styles/dark",
						}}
					>
						<MapControls showZoom showFullscreen position="bottom-right" />
						<ChoroplethLayer data={data} />
					</MapView>
				</div>
			</CardContent>
		</Card>
	);
}
