import { IconList, IconMap, IconWorld } from "@tabler/icons-react";
import { countries } from "countries-list";
import * as Flags from "country-flag-icons/react/3x2";
import * as MapLibreGL from "maplibre-gl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { COUNTRY_CENTROIDS } from "@/features/dashboard/country-centroids";
import type { AdminDashboardMetrics } from "@/features/dashboard/server/admin-dashboard";
import { useTheme } from "@/shared/components/theme-provider";
import { lookup } from "@/shared/lib/lookup";
import { MapControls, Map as MapView, useMap } from "@/shared/ui/map";
import { SectionCard } from "@/shared/ui/section-card";
import { Skeleton } from "@/shared/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

interface UsersByCountryCardProps {
	data: AdminDashboardMetrics["usersByCountry"] | undefined;
}

const countryNameToCode = new globalThis.Map<string, string>();
for (const [code, info] of Object.entries(countries)) {
	for (const alias of info.alias ?? []) countryNameToCode.set(alias, code);
}
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

interface CountryRow {
	country: string;
	code: string | null;
	count: number;
}

// Aggregate registrations by country, merging duplicate names under the same
// ISO code. Sorted by count desc — the list renders top-down, and the map draws
// larger bubbles first so smaller ones land on top.
function aggregateByCountry(
	data: AdminDashboardMetrics["usersByCountry"],
): CountryRow[] {
	const byCode = new globalThis.Map<string, CountryRow>();
	const byName = new globalThis.Map<string, CountryRow>();

	for (const entry of data) {
		const code = countryNameToCode.get(entry.country) ?? null;
		const bucket = code ? byCode : byName;
		const key = code ?? entry.country;
		const existing = bucket.get(key);
		if (existing) {
			existing.count += entry.count;
		} else {
			bucket.set(key, { country: entry.country, code, count: entry.count });
		}
	}

	return [...byCode.values(), ...byName.values()].sort(
		(a, b) => b.count - a.count,
	);
}

interface BubbleProperties {
	alpha2: string;
	userCount: number;
	countryName: string;
}

function buildGeoJson(
	data: AdminDashboardMetrics["usersByCountry"],
): GeoJSON.FeatureCollection<GeoJSON.Point, BubbleProperties> {
	const features: GeoJSON.Feature<GeoJSON.Point, BubbleProperties>[] = [];

	for (const row of aggregateByCountry(data)) {
		if (!row.code) continue;
		const coords = lookup(COUNTRY_CENTROIDS, row.code);
		if (!coords || row.count <= 0) continue;

		features.push({
			type: "Feature",
			geometry: { type: "Point", coordinates: coords },
			properties: {
				alpha2: row.code,
				userCount: row.count,
				countryName: row.country,
			},
		});
	}

	return { type: "FeatureCollection", features };
}

const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

function subscribeToSystemDark(onChange: () => void) {
	const mql = window.matchMedia(DARK_SCHEME_QUERY);
	mql.addEventListener("change", onChange);
	return () => mql.removeEventListener("change", onChange);
}

function useResolvedAppTheme(): "light" | "dark" {
	const { theme } = useTheme();
	const systemDark = useSyncExternalStore(
		subscribeToSystemDark,
		() => window.matchMedia(DARK_SCHEME_QUERY).matches,
		() => false,
	);

	if (theme === "system") return systemDark ? "dark" : "light";
	return theme;
}

function BubbleLayer({
	data,
}: {
	data: AdminDashboardMetrics["usersByCountry"];
}) {
	const { map, isLoaded } = useMap();
	const popupRef = useRef<MapLibreGL.Popup | null>(null);
	const mapRef = useRef(map);

	const geojson = buildGeoJson(data);
	const geojsonRef = useRef(geojson);

	useEffect(() => {
		mapRef.current = map;
		geojsonRef.current = geojson;
	});

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
			// SAFETY: the bundled world GeoJSON always carries countryName.
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

		// SAFETY: this source id is registered by us as a GeoJSON source.
		const source = map.getSource(SOURCE_ID) as MapLibreGL.GeoJSONSource;
		if (source) {
			source.setData(geojson);
		}
	}, [isLoaded, map, geojson]);

	return null;
}

function CountryFlag({ code }: { code: string | null }) {
	const upper = code?.toUpperCase();
	// SAFETY: the table is keyed by this enum; the fallback covers an unrecognised key.
	// biome-ignore lint/performance/noDynamicNamespaceImportAccess: flag is resolved at runtime from the country code; all flags are needed
	const Flag = upper ? Flags[upper as keyof typeof Flags] : undefined;

	if (!Flag) {
		return (
			<IconWorld
				aria-hidden
				className="size-4 shrink-0 text-muted-foreground"
			/>
		);
	}

	return <Flag aria-hidden className="h-4 w-6 shrink-0 rounded-sm" />;
}

function CountryList({
	data,
}: {
	data: AdminDashboardMetrics["usersByCountry"];
}) {
	const rows = aggregateByCountry(data);

	return (
		<div className="max-h-[300px] space-y-1 overflow-y-auto md:max-h-[400px]">
			{rows.map((row) => (
				<div
					key={row.code ?? row.country}
					className="flex items-center justify-between gap-3 border-b py-2 last:border-b-0"
				>
					<div className="flex min-w-0 items-center gap-2">
						<CountryFlag code={row.code} />
						<span className="truncate text-sm">{row.country}</span>
					</div>
					<span className="shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
						{row.count}
					</span>
				</div>
			))}
		</div>
	);
}

export function UsersByCountryCard({ data }: UsersByCountryCardProps) {
	const resolvedTheme = useResolvedAppTheme();
	const [view, setView] = useState<"map" | "list">("map");

	if (!data) {
		return (
			<SectionCard title="Users by Country">
				<Skeleton className="h-[300px] w-full md:h-[400px]" />
			</SectionCard>
		);
	}

	if (data.length === 0) {
		return (
			<SectionCard title="Users by Country">
				<div className="flex h-[300px] items-center justify-center md:h-[400px]">
					<p className="text-muted-foreground">No country data available</p>
				</div>
			</SectionCard>
		);
	}

	return (
		<Tabs
			value={view}
			onValueChange={(v) => setView(v === "list" ? "list" : "map")}
		>
			<SectionCard
				title="Users by Country"
				action={
					<TabsList>
						<TabsTrigger value="map">
							<IconMap />
							<span className="hidden sm:inline">Map</span>
						</TabsTrigger>
						<TabsTrigger value="list">
							<IconList />
							<span className="hidden sm:inline">List</span>
						</TabsTrigger>
					</TabsList>
				}
			>
				<TabsContent value="map">
					<div className="h-[300px] md:h-[400px]">
						<MapView center={MAP_CENTER} zoom={1.5} theme={resolvedTheme}>
							<MapControls showZoom showFullscreen position="bottom-right" />
							<BubbleLayer data={data} />
						</MapView>
					</div>
				</TabsContent>
				<TabsContent value="list">
					<CountryList data={data} />
				</TabsContent>
			</SectionCard>
		</Tabs>
	);
}
