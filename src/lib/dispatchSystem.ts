import { User } from '../data/users';

export interface Order {
  id: string;
  customer: string;
  items: string[];
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'delivering' | 'delivered';
  time: string;
  address: string;
  location?: { lat: number; lng: number }; // Mock location
  courierId?: string;
}

// Mock store location (São Paulo center)
const STORE_LOCATION = { lat: -23.550520, lng: -46.633308 };

// Calculate distance between two points (Haversine formula approximation)
export function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export function autoDispatch(orders: Order[], couriers: User[]) {
  const readyOrders = orders.filter(o => o.status === 'ready' && !o.courierId);
  const availableCouriers = couriers.filter(c => c.role === 'courier' && c.isAvailable && c.currentLocation);

  const assignments: { orderId: string; courierId: string }[] = [];
  const potentialMatches: { courierId: string; orderId: string; distance: number }[] = [];

  // 1. Calculate all possible matches and their distances
  availableCouriers.forEach(courier => {
    readyOrders.forEach(order => {
      if (order.location && courier.currentLocation) {
        const dist = getDistanceFromLatLonInKm(
          courier.currentLocation.lat,
          courier.currentLocation.lng,
          order.location.lat,
          order.location.lng
        );
        potentialMatches.push({
          courierId: courier.id,
          orderId: order.id,
          distance: dist
        });
      }
    });
  });

  // 2. Sort by distance (closest first) - Global Optimization
  // This ensures that we prioritize the absolute closest pairs first, 
  // rather than just iterating through couriers one by one.
  potentialMatches.sort((a, b) => a.distance - b.distance);

  // 3. Assign
  const assignedOrderIds = new Set<string>();
  const assignedCourierIds = new Set<string>();

  potentialMatches.forEach(match => {
    if (!assignedOrderIds.has(match.orderId) && !assignedCourierIds.has(match.courierId)) {
      assignments.push({
        orderId: match.orderId,
        courierId: match.courierId
      });
      assignedOrderIds.add(match.orderId);
      assignedCourierIds.add(match.courierId);
    }
  });

  return assignments;
}
