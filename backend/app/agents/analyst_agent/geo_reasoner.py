"""Geo Reasoner"""
from app.schemas import GeoData

def enrich_geo_context(geo_data: GeoData) -> str:
    """Use Scout geo-data for local reasoning."""
    if not geo_data or not geo_data.location:
        return "No specific geographic advantage detected."
        
    advantage = f"Located in {geo_data.location}. "
    if geo_data.traffic_level:
        advantage += f"Traffic is {geo_data.traffic_level}. "
    if geo_data.distance_score:
        advantage += f"Accessibility: {geo_data.distance_score}. "
    if geo_data.nearby_landmarks:
        advantage += f"Near: {', '.join(geo_data.nearby_landmarks)}. "
        
    return advantage
