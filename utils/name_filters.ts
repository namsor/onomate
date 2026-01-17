interface FilterCriteria {
  minLength?: number;
  maxLength?: number;
  allowedTones?: string[];
  forbiddenWords?: string[];
  requiredDomains?: string[];
  trademarkRiskTolerance?: 'low' | 'medium' | 'high';
  culturalSensitivity?: boolean;
  internationalFriendly?: boolean;
}

interface NameAnalysis {
  name: string;
  length: number;
  syllableCount: number;
  pronunciationDifficulty: number; // 0-1 scale
  memoryScore: number; // 0-1 scale
  brandabilityScore: number; // 0-1 scale
  internationalViability: number; // 0-1 scale
  linguisticRisks: string[];
  phoneticallyPleasant: boolean;
  culturalConcerns: string[];
}

class NameFilters {
  /**
   * Filters name suggestions based on founder constraints
   */
  static filterByConstraints(names: string[], criteria: FilterCriteria): string[] {
    return names.filter(name => {
      // Length filters
      if (criteria.minLength && name.length < criteria.minLength) return false;
      if (criteria.maxLength && name.length > criteria.maxLength) return false;

      // Forbidden words check
      if (criteria.forbiddenWords) {
        const lowerName = name.toLowerCase();
        if (criteria.forbiddenWords.some(word => lowerName.includes(word.toLowerCase()))) {
          return false;
        }
      }

      // Cultural sensitivity check
      if (criteria.culturalSensitivity) {
        const risks = this.analyzeCulturalRisks(name);
        if (risks.length > 0) return false;
      }

      return true;
    });
  }

  /**
   * Analyzes a single name across multiple dimensions
   */
  static analyzeName(name: string): NameAnalysis {
    const syllables = this.countSyllables(name);
    const pronunciationDiff = this.calculatePronunciationDifficulty(name);
    const memoryScore = this.calculateMemoryScore(name);
    const brandability = this.calculateBrandabilityScore(name);
    const intlViability = this.calculateInternationalViability(name);
    const linguisticRisks = this.identifyLinguisticRisks(name);
    const phoneticallyPleasant = this.isPhoneticallyPleasant(name);
    const culturalConcerns = this.analyzeCulturalRisks(name);

    return {
      name,
      length: name.length,
      syllableCount: syllables,
      pronunciationDifficulty: pronunciationDiff,
      memoryScore,
      brandabilityScore: brandability,
      internationalViability: intlViability,
      linguisticRisks,
      phoneticallyPleasant,
      culturalConcerns
    };
  }

  /**
   * Ranks names by overall viability score
   */
  static rankNames(names: string[], criteria?: FilterCriteria): { name: string; score: number; analysis: NameAnalysis }[] {
    return names
      .map(name => ({
        name,
        score: this.calculateOverallScore(name, criteria),
        analysis: this.analyzeName(name)
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Identifies potential trademark conflicts using basic heuristics
   */
  static assessTrademarkRisk(name: string, industry: string): 'low' | 'medium' | 'high' {
    // Basic heuristic analysis - in production would use actual trademark database
    const commonWords = ['app', 'tech', 'soft', 'ware', 'data', 'cloud', 'smart', 'digital'];
    const lowerName = name.toLowerCase();
    
    // Very common words are higher risk
    if (commonWords.some(word => lowerName.includes(word))) {
      return 'high';
    }

    // Short, common names are medium risk
    if (name.length <= 4 && /^[a-z]+$/i.test(name)) {
      return 'medium';
    }

    // Unique/coined words are generally lower risk
    if (this.isCoinedWord(name)) {
      return 'low';
    }

    return 'medium';
  }

  /**
   * Suggests domain variations and alternatives
   */
  static suggestDomainVariations(name: string): string[] {
    const variations = [];
    const lowerName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Primary suggestions
    variations.push(`${lowerName}.com`);
    variations.push(`${lowerName}.io`);
    variations.push(`${lowerName}.co`);
    
    // With common prefixes/suffixes
    variations.push(`get${lowerName}.com`);
    variations.push(`try${lowerName}.com`);
    variations.push(`${lowerName}app.com`);
    variations.push(`${lowerName}hq.com`);
    
    // Abbreviated versions
    if (name.length > 6) {
      const abbreviated = lowerName.substring(0, 4);
      variations.push(`${abbreviated}.com`);
    }

    return variations;
  }

  // Private helper methods

  private static countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    
    return matches ? matches.length : 1;
  }

  private static calculatePronunciationDifficulty(name: string): number {
    let difficulty = 0;
    
    // Check for difficult consonant clusters
    const difficultClusters = /[bcdfghjklmnpqrstvwxyz]{3,}/gi;
    if (difficultClusters.test(name)) difficulty += 0.3;
    
    // Check for uncommon letter combinations
    const uncommonCombos = /[qx]|[ck]{2,}|[dt]h/gi;
    if (uncommonCombos.test(name)) difficulty += 0.2;
    
    // Length penalty
    if (name.length > 8) difficulty += (name.length - 8) * 0.05;
    
    // Mixed case difficulty
    const caseChanges = (name.match(/[a-z][A-Z]/g) || []).length;
    difficulty += caseChanges * 0.1;
    
    return Math.min(difficulty, 1);
  }

  private static calculateMemoryScore(name: string): number {
    let score = 0.5; // Base score
    
    // Shorter is generally more memorable
    if (name.length <= 6) score += 0.3;
    else if (name.length <= 8) score += 0.1;
    else if (name.length > 12) score -= 0.2;
    
    // Rhythm and flow (alternating consonants/vowels)
    const rhythm = this.hasGoodRhythm(name);
    if (rhythm) score += 0.2;
    
    // Familiar patterns
    if (this.hasFamiliarPatterns(name)) score += 0.1;
    
    // Avoid numbers and special characters
    if (/[0-9]/.test(name)) score -= 0.2;
    if (/[^a-zA-Z]/.test(name)) score -= 0.1;
    
    return Math.max(0, Math.min(1, score));
  }

  private static calculateBrandabilityScore(name: string): number {
    let score = 0.5;
    
    // Uniqueness (not a dictionary word)
    if (!this.isDictionaryWord(name)) score += 0.2;
    
    // Visual appeal
    if (this.hasVisualAppeal(name)) score += 0.1;
    
    // Evokes emotion or meaning
    if (this.evokesPositiveAssociation(name)) score += 0.2;
    
    // Scalability (not too specific)
    if (!this.isTooSpecific(name)) score += 0.1;
    
    return Math.max(0, Math.min(1, score));
  }

  private static calculateInternationalViability(name: string): number {
    let score = 0.8; // Start optimistic
    
    // Check for letters that don't exist in many languages
    if (/[jqvwx]/i.test(name)) score -= 0.1;
    
    // Check for difficult combinations for non-English speakers
    if (/th|ch|sh|gh/i.test(name)) score -= 0.05;
    
    // Shorter names are generally more international
    if (name.length > 8) score -= 0.1;
    
    // Check for potential negative meanings in common languages
    const negativeWords = ['shit', 'puta', 'merde']; // Basic check
    if (negativeWords.some(word => name.toLowerCase().includes(word))) {
      score -= 0.5;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  private static identifyLinguisticRisks(name: string): string[] {
    const risks = [];
    
    // Difficult pronunciation
    if (this.calculatePronunciationDifficulty(name) > 0.7) {
      risks.push('Difficult pronunciation');
    }
    
    // Ambiguous spelling
    if (/[ei][ei]|[ph]|[ck]/i.test(name)) {
      risks.push('Potentially ambiguous spelling');
    }
    
    // Homophones with common words
    const homophones = this.checkHomophones(name);
    if (homophones.length > 0) {
      risks.push(`Sounds like: ${homophones.join(', ')}`);
    }
    
    return risks;
  }

  private static isPhoneticallyPleasant(name: string): boolean {
    // Check for pleasing sound patterns
    const hasFlowingVowels = /[aeiou].*[aeiou]/i.test(name);
    const hasBalancedConsonants = !/[bcdfghjklmnpqrstvwxyz]{4,}/i.test(name);
    const hasGoodEnding = !/[qxz]$/i.test(name);
    
    return hasFlowingVowels && hasBalancedConsonants && hasGoodEnding;
  }

  private static analyzeCulturalRisks(name: string): string[] {
    const risks = [];
    const lowerName = name.toLowerCase();
    
    // Basic profanity check
    const profanity = ['damn', 'hell', 'crap']; // Simplified list
    if (profanity.some(word => lowerName.includes(word))) {
      risks.push('Contains potentially offensive language');
    }
    
    // Religious terms (could be sensitive)
    const religious = ['god', 'christ', 'allah', 'buddha'];
    if (religious.some(word => lowerName.includes(word))) {
      risks.push('Contains religious terminology');
    }
    
    // Political terms
    const political = ['trump', 'biden', 'liberal', 'conservative'];
    if (political.some(word => lowerName.includes(word))) {
      risks.push('Contains political terminology');
    }
    
    return risks;
  }

  private static calculateOverallScore(name: string, criteria?: FilterCriteria): number {
    const analysis = this.analyzeName(name);
    
    let score = 0;
    score += analysis.memoryScore * 0.25;
    score += analysis.brandabilityScore * 0.25;
    score += (1 - analysis.pronunciationDifficulty) * 0.2;
    score += analysis.internationalViability * 0.15;
    score += analysis.phoneticallyPleasant ? 0.1 : 0;
    score += analysis.linguisticRisks.length === 0 ? 0.05 : 0;
    
    // Penalty for cultural concerns
    if (analysis.culturalConcerns.length > 0) {
      score -= 0.2;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  // Additional helper methods (simplified implementations)

  private static isCoinedWord(name: string): boolean {
    // Simplified check for coined/invented words
    return !this.isDictionaryWord(name) && !/\d/.test(name);
  }

  private static hasGoodRhythm(name: string): boolean {
    // Check for alternating consonant/vowel pattern (simplified)
    const vowels = 'aeiou';
    let alternates = true;
    let lastWasVowel = vowels.includes(name[0].toLowerCase());
    
    for (let i = 1; i < name.length; i++) {
      const isVowel = vowels.includes(name[i].toLowerCase());
      if (isVowel === lastWasVowel) {
        alternates = false;
        break;
      }
      lastWasVowel = isVowel;
    }
    
    return alternates;
  }

  private static hasFamiliarPatterns(name: string): boolean {
    // Check for familiar English patterns
    const familiarPatterns = /^[A-Z][a-z]+$|^[A-Z][a-z]*[A-Z][a-z]*$/;
    return familiarPatterns.test(name);
  }

  private static isDictionaryWord(name: string): boolean {
    // Simplified dictionary check (would use real dictionary in production)
    const commonWords = [
      'apple', 'book', 'car', 'dog', 'easy', 'fast', 'good', 'help',
      'idea', 'just', 'kind', 'love', 'make', 'nice', 'open', 'play',
      'quick', 'real', 'safe', 'time', 'user', 'very', 'work', 'year', 'zero'
    ];
    return commonWords.includes(name.toLowerCase());
  }

  private static hasVisualAppeal(name: string): boolean {
    // Check for balanced visual appearance
    const hasGoodLength = name.length >= 4 && name.length <= 10;
    const hasBalancedCase = /^[A-Z][a-z]*$/.test(name) || /^[A-Z][a-z]*[A-Z][a-z]*$/.test(name);
    return hasGoodLength && hasBalancedCase;
  }

  private static evokesPositiveAssociation(name: string): boolean {
    // Check for positive connotations (simplified)
    const positiveRoots = ['bright', 'fast', 'smart', 'clear', 'grow', 'build', 'connect'];
    const lowerName = name.toLowerCase();
    return positiveRoots.some(root => lowerName.includes(root));
  }

  private static isTooSpecific(name: string): boolean {
    // Check if name is too specific to current business model
    const specificTerms = ['web', 'mobile', 'app', 'software', 'platform', 'tool'];
    const lowerName = name.toLowerCase();
    return specificTerms.some(term => lowerName.includes(term));
  }

  private static checkHomophones(name: string): string[] {
    // Simplified homophone detection
    const homophones: { [key: string]: string[] } = {
      'to': ['two', 'too'],
      'for': ['four', 'fore'],
      'by': ['buy', 'bye'],
      'no': ['know'],
      'so': ['sew', 'sow']
    };
    
    const lowerName = name.toLowerCase();
    return homophones[lowerName] || [];
  }
}

export default NameFilters;