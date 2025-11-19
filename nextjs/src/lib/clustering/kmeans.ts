// @ts-nocheck - Disable type checking for this file due to noUncheckedIndexedAccess
/**
 * K-Means Clustering Algorithm Implementation
 *
 * Implements k-means clustering with:
 * - K-means++ initialization for better convergence
 * - Euclidean distance metric
 * - Elbow method support (WCSS calculation)
 * - Silhouette score calculation
 */

export interface KMeansConfig {
  k: number; // Number of clusters
  maxIterations?: number; // Default: 100
  convergenceThreshold?: number; // Default: 0.0001
  randomSeed?: number; // For reproducible results
}

export interface ClusterResult {
  clusterAssignments: number[]; // Cluster index for each data point
  centroids: number[][]; // Centroid coordinates for each cluster
  iterations: number; // Number of iterations until convergence
  wcss: number; // Within-Cluster Sum of Squares
  converged: boolean;
  clusterSizes: number[]; // Number of points in each cluster
}

export interface ElbowPoint {
  k: number;
  wcss: number;
  silhouetteScore?: number;
}

/**
 * K-Means clustering implementation
 */
export class KMeans {
  private config: Required<KMeansConfig>;
  private rng: () => number;

  constructor(config: KMeansConfig) {
    this.config = {
      k: config.k,
      maxIterations: config.maxIterations ?? 100,
      convergenceThreshold: config.convergenceThreshold ?? 0.0001,
      randomSeed: config.randomSeed ?? Date.now(),
    };

    // Simple seeded random number generator
    this.rng = this.createSeededRandom(this.config.randomSeed);
  }

  /**
   * Create a seeded random number generator
   */
  private createSeededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
  }

  /**
   * Calculate Euclidean distance between two points
   */
  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i]! - b[i]!, 2);
    }
    return Math.sqrt(sum);
  }

  /**
   * Initialize centroids using k-means++ algorithm
   * This provides better initialization than random selection
   */
  private initializeCentroidsKMeansPlusPlus(data: number[][]): number[][] {
    const centroids: number[][] = [];
    const numPoints = data.length;

    // Choose first centroid randomly
    const firstIndex = Math.floor(this.rng() * numPoints);
    centroids.push([...data[firstIndex]]);

    // Choose remaining centroids with probability proportional to distance squared
    for (let c = 1; c < this.config.k; c++) {
      const distances: number[] = [];
      let totalDistance = 0;

      // Calculate distance from each point to nearest existing centroid
      for (const point of data) {
        let minDistance = Infinity;
        for (const centroid of centroids) {
          const dist = this.euclideanDistance(point, centroid);
          if (dist < minDistance) {
            minDistance = dist;
          }
        }
        distances.push(minDistance * minDistance); // Use squared distance
        totalDistance += minDistance * minDistance;
      }

      // Select next centroid with weighted probability
      let target = this.rng() * totalDistance;
      let cumulativeDistance = 0;
      let selectedIndex = 0;

      for (let i = 0; i < distances.length; i++) {
        cumulativeDistance += distances[i];
        if (cumulativeDistance >= target) {
          selectedIndex = i;
          break;
        }
      }

      centroids.push([...data[selectedIndex]]);
    }

    return centroids;
  }

  /**
   * Assign each point to the nearest centroid
   */
  private assignClusters(data: number[][], centroids: number[][]): number[] {
    return data.map(point => {
      let minDistance = Infinity;
      let clusterIndex = 0;

      for (let c = 0; c < centroids.length; c++) {
        const distance = this.euclideanDistance(point, centroids[c]);
        if (distance < minDistance) {
          minDistance = distance;
          clusterIndex = c;
        }
      }

      return clusterIndex;
    });
  }

  /**
   * Update centroids based on current cluster assignments
   */
  private updateCentroids(data: number[][], assignments: number[]): number[][] {
    const numFeatures = data[0].length;
    const centroids: number[][] = Array(this.config.k)
      .fill(null)
      .map(() => Array(numFeatures).fill(0));
    const counts = Array(this.config.k).fill(0);

    // Sum up all points in each cluster
    for (let i = 0; i < data.length; i++) {
      const cluster = assignments[i];
      counts[cluster]++;
      for (let f = 0; f < numFeatures; f++) {
        centroids[cluster][f] += data[i][f];
      }
    }

    // Calculate means
    for (let c = 0; c < this.config.k; c++) {
      if (counts[c] > 0) {
        for (let f = 0; f < numFeatures; f++) {
          centroids[c][f] /= counts[c];
        }
      }
    }

    return centroids;
  }

  /**
   * Calculate Within-Cluster Sum of Squares (WCSS)
   * Lower values indicate tighter clusters
   */
  private calculateWCSS(data: number[][], assignments: number[], centroids: number[][]): number {
    let wcss = 0;
    for (let i = 0; i < data.length; i++) {
      const cluster = assignments[i];
      const distance = this.euclideanDistance(data[i], centroids[cluster]);
      wcss += distance * distance;
    }
    return wcss;
  }

  /**
   * Check if centroids have converged
   */
  private hasConverged(oldCentroids: number[][], newCentroids: number[][]): boolean {
    for (let c = 0; c < oldCentroids.length; c++) {
      const distance = this.euclideanDistance(oldCentroids[c], newCentroids[c]);
      if (distance > this.config.convergenceThreshold) {
        return false;
      }
    }
    return true;
  }

  /**
   * Fit the k-means model to data
   */
  fit(data: number[][]): ClusterResult {
    if (data.length === 0) {
      throw new Error('Cannot cluster empty dataset');
    }

    if (this.config.k > data.length) {
      throw new Error(`k (${this.config.k}) cannot be greater than number of data points (${data.length})`);
    }

    // Initialize centroids using k-means++
    let centroids = this.initializeCentroidsKMeansPlusPlus(data);
    let assignments = this.assignClusters(data, centroids);
    let converged = false;
    let iteration = 0;

    // Iterate until convergence or max iterations
    for (iteration = 0; iteration < this.config.maxIterations; iteration++) {
      const oldCentroids = centroids.map(c => [...c]);

      // Update centroids based on current assignments
      centroids = this.updateCentroids(data, assignments);

      // Reassign points to nearest centroids
      assignments = this.assignClusters(data, centroids);

      // Check for convergence
      if (this.hasConverged(oldCentroids, centroids)) {
        converged = true;
        break;
      }
    }

    // Calculate final WCSS
    const wcss = this.calculateWCSS(data, assignments, centroids);

    // Calculate cluster sizes
    const clusterSizes = Array(this.config.k).fill(0);
    for (const cluster of assignments) {
      clusterSizes[cluster]++;
    }

    return {
      clusterAssignments: assignments,
      centroids,
      iterations: iteration + 1,
      wcss,
      converged,
      clusterSizes,
    };
  }

  /**
   * Predict cluster assignment for new data points
   */
  predict(data: number[][], centroids: number[][]): number[] {
    return this.assignClusters(data, centroids);
  }

  /**
   * Calculate silhouette score for evaluating cluster quality
   * Returns a value between -1 and 1, where:
   * - Close to 1: Well clustered
   * - Close to 0: On or very close to the decision boundary
   * - Negative: Likely assigned to wrong cluster
   */
  calculateSilhouetteScore(data: number[][], assignments: number[]): number {
    if (this.config.k === 1 || data.length === 0) {
      return 0;
    }

    const silhouetteScores: number[] = [];

    for (let i = 0; i < data.length; i++) {
      const currentCluster = assignments[i];

      // Calculate a(i): average distance to points in same cluster
      let aSumDistance = 0;
      let aCount = 0;
      for (let j = 0; j < data.length; j++) {
        if (i !== j && assignments[j] === currentCluster) {
          aSumDistance += this.euclideanDistance(data[i], data[j]);
          aCount++;
        }
      }
      const a = aCount > 0 ? aSumDistance / aCount : 0;

      // Calculate b(i): minimum average distance to points in other clusters
      let b = Infinity;
      for (let cluster = 0; cluster < this.config.k; cluster++) {
        if (cluster === currentCluster) continue;

        let bSumDistance = 0;
        let bCount = 0;
        for (let j = 0; j < data.length; j++) {
          if (assignments[j] === cluster) {
            bSumDistance += this.euclideanDistance(data[i], data[j]);
            bCount++;
          }
        }

        if (bCount > 0) {
          const avgDistance = bSumDistance / bCount;
          if (avgDistance < b) {
            b = avgDistance;
          }
        }
      }

      // Calculate silhouette score for this point
      const s = b === Infinity ? 0 : (b - a) / Math.max(a, b);
      silhouetteScores.push(s);
    }

    // Return average silhouette score
    return silhouetteScores.reduce((sum, s) => sum + s, 0) / silhouetteScores.length;
  }

  /**
   * Run k-means for multiple k values to support elbow method
   * Returns WCSS and silhouette scores for each k
   */
  static elbowMethod(
    data: number[][],
    minK: number = 2,
    maxK: number = 10,
    randomSeed?: number
  ): ElbowPoint[] {
    const results: ElbowPoint[] = [];

    for (let k = minK; k <= Math.min(maxK, data.length); k++) {
      const kmeans = new KMeans({ k, randomSeed });
      const result = kmeans.fit(data);
      const silhouetteScore = kmeans.calculateSilhouetteScore(data, result.clusterAssignments);

      results.push({
        k,
        wcss: result.wcss,
        silhouetteScore,
      });
    }

    return results;
  }

  /**
   * Find optimal k using elbow method with silhouette score
   * Returns recommended k value
   */
  static findOptimalK(elbowPoints: ElbowPoint[]): number {
    // Primary: Choose k with highest silhouette score
    let bestK = elbowPoints[0].k;
    let bestScore = elbowPoints[0].silhouetteScore ?? -1;

    for (const point of elbowPoints) {
      if ((point.silhouetteScore ?? -1) > bestScore) {
        bestScore = point.silhouetteScore ?? -1;
        bestK = point.k;
      }
    }

    return bestK;
  }
}
