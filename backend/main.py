def print_trip_summary(
    destination,
    country,
    days,
    budget,
    currency,
    travel_month,
    travel_style,
    hotel_cost,
    food_cost,
    transportation_cost,
    miscellaneous_cost
):
    total_cost = (
        hotel_cost
        + food_cost
        + transportation_cost
        + miscellaneous_cost
    )

    print("========================")
    print("KelanaAI")
    print("========================")
    print(f"Destination  : {destination}")
    print(f"Country      : {country}")
    print(f"Days         : {days}")
    print(f"Budget       : {budget} {currency}")
    print(f"Currency     : {currency}")
    print(f"Travel Month : {travel_month}")
    print(f"Travel Style : {travel_style}")
    print()
    print("Cost Breakdown")
    print(f"Hotel Cost   : {hotel_cost} {currency}")
    print(f"Food Cost    : {food_cost} {currency}")
    print(f"Transport    : {transportation_cost} {currency}")
    print(f"Miscellaneous: {miscellaneous_cost} {currency}")
    print(f"Total Cost   : {total_cost} {currency}")

    if total_cost > budget:
        print("⚠ Budget exceeded.")


destination = input("Destination : ")
country = input("Country : ")
days = int(input("Days : "))
budget = float(input("Budget : "))
currency = input("Currency : ")
travel_month = input("Travel Month : ")
travel_style = input("Travel Style : ")

hotel_cost = float(input("Hotel Cost : "))
food_cost = float(input("Food Cost : "))
transportation_cost = float(input("Transportation Cost : "))
miscellaneous_cost = float(input("Miscellaneous Cost : "))

print_trip_summary(
    destination,
    country,
    days,
    budget,
    currency,
    travel_month,
    travel_style,
    hotel_cost,
    food_cost,
    transportation_cost,
    miscellaneous_cost
)