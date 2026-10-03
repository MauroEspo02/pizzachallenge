export interface Dough {
  id: string;
  name: string;
  shortName: string;
  tone: string;
  sortOrder: number;
}

export interface Person {
  id: string;
  name: string;
}

export interface PizzaIngredient {
  label: string;
  ingredientId: string | null;
}

/** GUSTO / RICETTA */
export interface Recipe {
  id: string;
  name: string;
  description: string | null;
  isDemo: boolean;
  artSeed: number;
  artUrl: string;
  createdBy: string | null;
  creators: Person[];
  ingredients: PizzaIngredient[];
  updatedAt: string;
  versions: RecipeVersion[];
}

export interface RecipeVersion {
  id: string;
  dough: Dough | null;
  tastingOrder: number;
  votingLocked: boolean;
}

/** PIZZA FISICA / VERSIONE DEL PANETTO: è ciò che si assaggia e si vota. */
export interface PizzaVersion {
  id: string;
  recipeId: string;
  name: string;
  description: string | null;
  isDemo: boolean;
  dough: Dough | null;
  tastingOrder: number;
  votingLocked: boolean;
  creators: Person[];
  ingredients: PizzaIngredient[];
  artUrl: string;
}
