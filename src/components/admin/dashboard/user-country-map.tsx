import { countries } from "countries-list";
import MapLibreGL from "maplibre-gl";
import { useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapControls, Map as MapView, useMap } from "@/components/ui/map";
import { Skeleton } from "@/components/ui/skeleton";
import { COUNTRY_CENTROIDS } from "@/lib/country-centroids";
import type { AdminDashboardMetrics } from "@/lib/server/admin/dashboard";

interface UserCountryMapProps {
	data: AdminDashboardMetrics["usersByCountry"] | undefined;
}

const countryNameToCode = new globalThis.Map<string, string>();
for (const [code, info] of Object.entries(countries)) {
	countryNameToCode.set(info.name, code);
}

const SOURCE_ID = "bubbles-source";
const CIRCLE_LAYER_ID = "bubbles-circle";
const LABEL_LAYER_ID = "bubbles-label";

const BUBBLE_COLOR = "#2563eb";
const BUBBLE_STROKE_COLOR = "#ffffff";

const CIRCLE_RADIUS_EXPRESSION: MapLibreGL.ExpressionSpecification = [
	"step",
	["get", "userCount"],
	8,
	6,
	14,
	21,
	22,
	51,
	30,
];

const MAP_CENTER: [number, number] = [10, 30];

function buildGeoJson(
	data: AdminDashboardMetrics["usersByCountry"],
): GeoJSON.FeatureCollection {
	const alpha2ToCount = new globalThis.Map<string, number>();
	const alpha2ToName = new globalThis.Map<string, string>();

	for (const entry of data) {
		const code = countryNameToCode.get(entry.country);
		if (!code) continue;
		alpha2ToCount.set(code, (alpha2ToCount.get(code) ?? 0) + entry.count);
		if (!alpha2ToName.has(code)) {
			alpha2ToName.set(code, entry.country);
		}
	}

	const features: GeoJSON.Feature[] = [];

	for (const [alpha2, count] of alpha2ToCount) {
		const coords = COUNTRY_CENTROIDS[alpha2];
		if (!coords || count <= 0) continue;

		features.push({
			type: "Feature",
			geometry: { type: "Point", coordinates: coords },
			properties: {
				alpha2,
				userCount: count,
				countryName:
					alpha2ToName.get(alpha2) ??
					countries[alpha2 as keyof typeof countries]?.name ??
					alpha2,
			},
		});
	}

	// Sort so smaller circles render on top (larger circles first in array → drawn first)
	features.sort(
		(a, b) =>
			(b.properties as { userCount: number }).userCount -
			(a.properties as { userCount: number }).userCount,
	);

	return { type: "FeatureCollection", features };
}

function BubbleLayer({
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

	useEffect(() => {
		if (!isLoaded || !map) return;

		map.addSource(SOURCE_ID, {
			type: "geojson",
			data: geojsonRef.current,
		});

		map.addLayer({
			id: CIRCLE_LAYER_ID,
			type: "circle",
			source: SOURCE_ID,
			paint: {
				"circle-radius": CIRCLE_RADIUS_EXPRESSION,
				"circle-color": BUBBLE_COLOR,
				"circle-opacity": 0.75,
				"circle-stroke-width": 1.5,
				"circle-stroke-color": BUBBLE_STROKE_COLOR,
			},
		});

		map.addLayer({
			id: LABEL_LAYER_ID,
			type: "symbol",
			source: SOURCE_ID,
			layout: {
				"text-field": ["to-string", ["get", "userCount"]],
				"text-size": 11,
				"text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
				"text-allow-overlap": true,
				"text-ignore-placement": true,
			},
			paint: {
				"text-color": "#ffffff",
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
					`<div style="font-size:13px;font-weight:500;padding:2px 4px">${name}</div>`,
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

		map.on("mousemove", CIRCLE_LAYER_ID, handleMouseMove);
		map.on("mouseleave", CIRCLE_LAYER_ID, handleMouseLeave);

		return () => {
			map.off("mousemove", CIRCLE_LAYER_ID, handleMouseMove);
			map.off("mouseleave", CIRCLE_LAYER_ID, handleMouseLeave);

			if (popupRef.current) {
				popupRef.current.remove();
				popupRef.current = null;
			}

			try {
				if (map.getLayer(LABEL_LAYER_ID)) map.removeLayer(LABEL_LAYER_ID);
				if (map.getLayer(CIRCLE_LAYER_ID)) map.removeLayer(CIRCLE_LAYER_ID);
				if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
			} catch {
				// ignore cleanup errors during unmount
			}
		};
	}, [isLoaded, map]);

	useEffect(() => {
		if (!isLoaded || !map) return;

		const source = map.getSource(SOURCE_ID) as MapLibreGL.GeoJSONSource;
		if (source) {
			source.setData(geojson);
		}
	}, [isLoaded, map, geojson]);

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
					<MapView center={MAP_CENTER} zoom={1.5}>
						<MapControls showZoom showFullscreen position="bottom-right" />
						<BubbleLayer data={data} />
					</MapView>
				</div>
			</CardContent>
		</Card>
	);
}
