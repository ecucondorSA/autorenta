/**
 * Web Worker for spatial indexing operations
 * Handles QuadTree construction and spatial queries off main thread
 */

interface Bounds {
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
}

interface CarData {
  carId: string;
  lat: number;
  lng: number;
  [key: string]: any;
}

interface QuadNode {
  bounds: Bounds;
  items: CarData[];
  children: QuadNode[] | null;
}

class QuadTree {
  private root: QuadNode;
  private maxItems = 8;
  private maxDepth = 8;

  constructor(bounds: Bounds, maxItems: number = 8, maxDepth: number = 8) {
    this.maxItems = maxItems;
    this.maxDepth = maxDepth;
    this.root = {
      bounds,
      items: [],
      children: null,
    };
  }

  insert(item: CarData): void {
    this.insertIntoNode(this.root, item, 0);
  }

  private insertIntoNode(node: QuadNode, item: CarData, depth: number): void {
    if (!this.isInBounds(node.bounds, item)) {
      return;
    }

    if (!node.children) {
      node.items.push(item);

      // Split if necessary
      if (node.items.length > this.maxItems && depth < this.maxDepth) {
        this.split(node, depth);
      }
    } else {
      // Insert into appropriate child
      for (const child of node.children) {
        this.insertIntoNode(child, item, depth + 1);
      }
    }
  }

  private split(node: QuadNode, depth: number): void {
    const bounds = node.bounds;
    const midLat = (bounds.min_lat + bounds.max_lat) / 2;
    const midLng = (bounds.min_lng + bounds.max_lng) / 2;

    node.children = [
      {
        bounds: {
          min_lat: bounds.min_lat,
          max_lat: midLat,
          min_lng: bounds.min_lng,
          max_lng: midLng,
        },
        items: [],
        children: null,
      },
      {
        bounds: {
          min_lat: bounds.min_lat,
          max_lat: midLat,
          min_lng: midLng,
          max_lng: bounds.max_lng,
        },
        items: [],
        children: null,
      },
      {
        bounds: {
          min_lat: midLat,
          max_lat: bounds.max_lat,
          min_lng: bounds.min_lng,
          max_lng: midLng,
        },
        items: [],
        children: null,
      },
      {
        bounds: {
          min_lat: midLat,
          max_lat: bounds.max_lat,
          min_lng: midLng,
          max_lng: bounds.max_lng,
        },
        items: [],
        children: null,
      },
    ];

    // Re-insert all items
    const items = node.items;
    node.items = [];
    for (const item of items) {
      this.insertIntoNode(node, item, depth + 1);
    }
  }

  query(bounds: Bounds): CarData[] {
    const results: CarData[] = [];
    this.queryNode(this.root, bounds, results);
    return results;
  }

  private queryNode(node: QuadNode, bounds: Bounds, results: CarData[]): void {
    if (!this.boundsOverlap(node.bounds, bounds)) {
      return;
    }

    if (!node.children) {
      for (const item of node.items) {
        if (this.isInBounds(bounds, item)) {
          results.push(item);
        }
      }
    } else {
      for (const child of node.children) {
        this.queryNode(child, bounds, results);
      }
    }
  }

  private isInBounds(bounds: Bounds, item: CarData): boolean {
    return (
      item.lat >= bounds.min_lat &&
      item.lat <= bounds.max_lat &&
      item.lng >= bounds.min_lng &&
      item.lng <= bounds.max_lng
    );
  }

  private boundsOverlap(bounds1: Bounds, bounds2: Bounds): boolean {
    return !(
      bounds1.max_lat < bounds2.min_lat ||
      bounds1.min_lat > bounds2.max_lat ||
      bounds1.max_lng < bounds2.min_lng ||
      bounds1.min_lng > bounds2.max_lng
    );
  }
}

// Handle messages from main thread
self.onmessage = (event: MessageEvent) => {
  const { action, data } = event.data;

  try {
    if (action === 'buildIndex') {
      const { bounds, cars, maxItems, maxDepth } = data;
      const tree = new QuadTree(bounds, maxItems, maxDepth);

      // Insert all cars
      for (const car of cars) {
        tree.insert(car);
      }

      // Return success (tree is built in worker)
      self.postMessage({ success: true, action: 'buildIndex' });
    } else if (action === 'query') {
      // Query operation would need tree instance persistence
      // For now, we'll rebuild on each query (alternative: keep tree in worker)
      const { bounds, cars, maxItems, maxDepth } = data;
      const tree = new QuadTree(bounds, maxItems, maxDepth);

      for (const car of cars) {
        tree.insert(car);
      }

      const results = tree.query(data.queryBounds);
      self.postMessage({ success: true, action: 'query', results });
    }
  } catch (error) {
    self.postMessage({
      success: false,
      action,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
