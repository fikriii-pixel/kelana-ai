from services.trip_service import (
    calculate_daily_budget,
    get_trip_category,
    get_travel_season
)


print("==================================")
print("KelanaAI")
print("==================================")

destination = input("Destination : ")
days = int(input("Days        : "))
budget = float(input("Budget      : "))
travel_month = input("Travel Month: ")

category = get_trip_category(budget)
daily_budget = calculate_daily_budget(budget, days)
season = get_travel_season(travel_month)

recommended_places = [
    "Tokyo Tower",
    "Shibuya",
    "Mount Fuji"
]

print()
print("==================================")
print("Trip Summary")
print("==================================")
print(f"Destination : {destination}")
print(f"Days        : {days}")
print(f"Budget      : {budget} USD")
print(f"Category    : {category}")
print(f"Daily Budget: {daily_budget} USD/Day")
print(f"Travel Month: {travel_month}")
print(f"Season      : {season}")

print()
print("Recommended Places")

for place in recommended_places:
    print(f"- {place}")