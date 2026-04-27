/**
 * mileage_utils.js
 *
 * NOTE: Image-based OCR mileage extraction has been removed.
 * Mileage is now entered manually by the employee at trip start and end.
 * Distance and total_price are calculated directly in the trip controller:
 *   distance    = end_mileage - start_mileage
 *   total_price = distance * route_rate
 *
 * Odometer images (start_odometer_img / end_odometer_img) are still accepted
 * and stored as proof, but their values are NOT parsed programmatically.
 */
