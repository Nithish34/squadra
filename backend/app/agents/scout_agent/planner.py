"""Scout Agent Planner module"""

def plan_tasks(niche: str, city: str, competitors: list[dict]) -> list[dict]:
    """Determines the collection subtasks based on inputs."""
    tasks = []
    
    tasks.append({
        "type": "geo_discovery",
        "description": f"Find nearby {niche} competitors in {city} via TomTom API",
        "niche": niche,
        "city": city
    })
    
    for comp in competitors:
        tasks.append({
            "type": "scrape",
            "description": f"Read competitor website: {comp['name']}",
            "url": comp['url'],
            "name": comp['name']
        })
        
    return tasks
