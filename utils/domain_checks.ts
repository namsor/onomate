interface DomainCheckResult {
  domain: string;
  available: boolean;
  price?: number;
  registrar?: string;
  whoisData?: any;
  lastChecked: string;
  alternatives?: string[];
}

interface BulkDomainResult {
  checked: DomainCheckResult[];
  summary: {
    total: number;
    available: number;
    unavailable: number;
    errors: number;
  };
}

class DomainChecker {
  private apiKey: string;
  private baseURL: string;
  private cache: Map<string, DomainCheckResult>;
  private cacheExpiry: number = 3600000; // 1 hour in milliseconds

  constructor(apiKey: string = '') {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.namecheap.com/xml.response'; // Example API
    this.cache = new Map();
  }

  /**
   * Check availability of a single domain
   */
  async checkDomain(domain: string): Promise<DomainCheckResult> {
    // Check cache first
    const cached = this.getCachedResult(domain);
    if (cached) return cached;

    try {
      const result = await this.performDomainCheck(domain);
      this.cacheResult(domain, result);
      return result;
    } catch (error) {
      console.error(`Domain check failed for ${domain}:`, error);
      return this.createErrorResult(domain, error);
    }
  }

  /**
   * Check multiple domains in bulk
   */
  async checkMultipleDomains(domains: string[]): Promise<BulkDomainResult> {
    const results: DomainCheckResult[] = [];
    const batchSize = 10; // Process in batches to avoid rate limits
    
    for (let i = 0; i < domains.length; i += batchSize) {
      const batch = domains.slice(i, i + batchSize);
      const batchPromises = batch.map(domain => this.checkDomain(domain));
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            console.error('Domain check failed:', result.reason);
          }
        }
      } catch (error) {
        console.error('Batch domain check failed:', error);
      }

      // Rate limiting - wait between batches
      if (i + batchSize < domains.length) {
        await this.delay(1000); // 1 second delay
      }
    }

    return this.summarizeBulkResults(results);
  }

  /**
   * Check common TLD variations for a name
   */
  async checkTLDVariations(baseName: string, tlds: string[] = ['.com', '.io', '.co', '.net', '.org']): Promise<DomainCheckResult[]> {
    const domains = tlds.map(tld => `${baseName}${tld}`);
    const bulkResult = await this.checkMultipleDomains(domains);
    return bulkResult.checked;
  }

  /**
   * Generate and check domain alternatives
   */
  async findAlternatives(baseName: string, maxAlternatives: number = 10): Promise<DomainCheckResult[]> {
    const alternatives = this.generateAlternatives(baseName, maxAlternatives);
    const bulkResult = await this.checkMultipleDomains(alternatives);
    return bulkResult.checked.filter(result => result.available);
  }

  /**
   * Get estimated domain acquisition cost
   */
  async getDomainPrice(domain: string): Promise<{ price: number; currency: string; isPremium: boolean }> {
    try {
      // Mock implementation - replace with actual pricing API
      const basePrice = domain.includes('.com') ? 12.99 : 
                       domain.includes('.io') ? 39.99 :
                       domain.includes('.co') ? 24.99 : 14.99;

      // Premium domain heuristics
      const isPremium = domain.length <= 5 || 
                       this.containsValuableKeywords(domain) ||
                       this.isNumericDomain(domain);

      const price = isPremium ? basePrice * 50 : basePrice;

      return {
        price,
        currency: 'USD',
        isPremium
      };
    } catch (error) {
      console.error(`Price check failed for ${domain}:`, error);
      throw error;
    }
  }

  /**
   * Check if domain is available for purchase vs already registered
   */
  async getWhoisData(domain: string): Promise<any> {
    try {
      // Mock WHOIS data - replace with actual WHOIS API
      const result = await this.checkDomain(domain);
      
      if (result.available) {
        return {
          available: true,
          registrar: null,
          registrationDate: null,
          expiryDate: null
        };
      } else {
        return {
          available: false,
          registrar: 'GoDaddy LLC',
          registrationDate: '2020-01-15',
          expiryDate: '2025-01-15',
          nameservers: ['ns1.example.com', 'ns2.example.com']
        };
      }
    } catch (error) {
      console.error(`WHOIS lookup failed for ${domain}:`, error);
      throw error;
    }
  }

  // Private helper methods

  private async performDomainCheck(domain: string): Promise<DomainCheckResult> {
    // Mock implementation - replace with actual domain checking service
    // This would integrate with services like Namecheap, GoDaddy, or WhoisJSON APIs
    
    await this.delay(Math.random() * 1000); // Simulate API delay
    
    // Simple heuristic for demo purposes
    const isAvailable = Math.random() > 0.6; // 40% chance of availability
    const price = isAvailable ? await this.getDomainPrice(domain) : undefined;

    const result: DomainCheckResult = {
      domain,
      available: isAvailable,
      lastChecked: new Date().toISOString()
    };
    
    if (price?.price !== undefined) {
      result.price = price.price;
    }
    
    if (!isAvailable) {
      result.registrar = 'Mock Registrar';
      result.alternatives = this.generateAlternatives(domain, 3);
    } else {
      result.alternatives = [];
    }
    
    return result;
  }

  private generateAlternatives(baseName: string, count: number): string[] {
    const cleanName = baseName.replace(/\.(com|io|co|net|org)$/i, '');
    const alternatives: string[] = [];

    // Common prefixes/suffixes
    const prefixes = ['get', 'try', 'my', 'the', 'use'];
    const suffixes = ['app', 'hq', 'io', 'ly', 'co', 'labs', 'studio'];

    // Generate variations
    for (let i = 0; i < count && alternatives.length < count; i++) {
      if (Math.random() > 0.5) {
        // Add prefix
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        alternatives.push(`${prefix}${cleanName}.com`);
      } else {
        // Add suffix
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        alternatives.push(`${cleanName}${suffix}.com`);
      }
    }

    // Remove duplicates
    return [...new Set(alternatives)];
  }

  private containsValuableKeywords(domain: string): boolean {
    const valuableKeywords = [
      'app', 'tech', 'ai', 'crypto', 'pay', 'shop', 'bank', 'car', 'food',
      'health', 'money', 'travel', 'game', 'music', 'video', 'news', 'social'
    ];
    
    const lowerDomain = domain.toLowerCase();
    return valuableKeywords.some(keyword => lowerDomain.includes(keyword));
  }

  private isNumericDomain(domain: string): boolean {
    const cleanDomain = domain.replace(/\.(com|io|co|net|org)$/i, '');
    return /^\d+$/.test(cleanDomain) && cleanDomain.length <= 4;
  }

  private getCachedResult(domain: string): DomainCheckResult | null {
    const cached = this.cache.get(domain);
    if (!cached) return null;

    const age = Date.now() - new Date(cached.lastChecked).getTime();
    if (age > this.cacheExpiry) {
      this.cache.delete(domain);
      return null;
    }

    return cached;
  }

  private cacheResult(domain: string, result: DomainCheckResult): void {
    this.cache.set(domain, result);
  }

  private createErrorResult(domain: string, error: any): DomainCheckResult {
    return {
      domain,
      available: false,
      lastChecked: new Date().toISOString(),
      whoisData: { error: error.message || 'Unknown error' }
    };
  }

  private summarizeBulkResults(results: DomainCheckResult[]): BulkDomainResult {
    const summary = {
      total: results.length,
      available: 0,
      unavailable: 0,
      errors: 0
    };

    results.forEach(result => {
      if (result.whoisData?.error) {
        summary.errors++;
      } else if (result.available) {
        summary.available++;
      } else {
        summary.unavailable++;
      }
    });

    return {
      checked: results,
      summary
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Batch check domains with rate limiting
   */
  async checkDomainsForNames(names: string[]): Promise<{ [name: string]: DomainCheckResult[] }> {
    const results: { [name: string]: DomainCheckResult[] } = {};

    for (const name of names) {
      try {
        const tldResults = await this.checkTLDVariations(name);
        results[name] = tldResults;
        
        // Rate limiting between names
        await this.delay(500);
      } catch (error) {
        console.error(`Failed to check domains for ${name}:`, error);
        results[name] = [];
      }
    }

    return results;
  }

  /**
   * Find the best available domain for a name
   */
  async findBestDomain(name: string, preferences: { tlds?: string[], maxPrice?: number }): Promise<DomainCheckResult | null> {
    const preferredTLDs = preferences.tlds || ['.com', '.io', '.co'];
    const maxPrice = preferences.maxPrice || 100;

    // Check preferred TLDs first
    for (const tld of preferredTLDs) {
      const domain = `${name}${tld}`;
      const result = await this.checkDomain(domain);
      
      if (result.available && (!result.price || result.price <= maxPrice)) {
        return result;
      }
    }

    // Check alternatives if preferred domains unavailable
    const alternatives = await this.findAlternatives(name, 5);
    return alternatives.find(alt => !alt.price || alt.price <= maxPrice) || null;
  }
}

export default DomainChecker;