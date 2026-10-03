/**
 * Libreria ingredienti di partenza.
 * Viene copiata nel database al primo avvio: da lì l'admin può modificarli e aggiungerne di nuovi.
 *
 * Per aggiungere un ingrediente nel codice:
 *   1. aggiungi un oggetto qui sotto (id in minuscolo con trattini, alias = modi in cui si scrive);
 *   2. scegli un "visual" tra quelli in art/visuals/index.ts e uno o due colori;
 *   3. incrementa CATALOG_VERSION: all'avvio successivo verrà aggiunto al database.
 */
import type { IngredientDef } from './types';

export const CATALOG_VERSION = 1;

export const DEFAULT_INGREDIENTS: IngredientDef[] = [
  // ——— Salse e creme ———
  { id: 'pomodoro', name: 'Pomodoro', aliases: ['pomodoro', 'pomodori', 'salsa di pomodoro', 'sugo', 'salsa', 'passata', 'passata di pomodoro', 'pelati', 'pomodoro pelato', 'pomodori pelati', 'san marzano', 'pomodoro san marzano', 'rossa'], category: 'basi', visual: 'sauce', layer: 'sauce', density: 1, colors: ['#C2381F'] },
  { id: 'crema-zucca', name: 'Crema di zucca', aliases: ['crema di zucca', 'vellutata di zucca', 'zucca in crema', 'purea di zucca', 'crema zucca'], category: 'basi', visual: 'sauce', layer: 'sauce', density: 1, colors: ['#E5892E'] },
  { id: 'pesto', name: 'Pesto', aliases: ['pesto', 'pesto alla genovese', 'pesto genovese', 'pesto di basilico'], category: 'basi', visual: 'sauce', layer: 'sauce', density: 1, colors: ['#4E7B2C'] },
  { id: 'crema-pistacchio', name: 'Crema di pistacchio', aliases: ['crema di pistacchio', 'pesto di pistacchio', 'crema al pistacchio'], category: 'basi', visual: 'sauce', layer: 'sauce', density: 1, colors: ['#A6B864'] },
  { id: 'crema', name: 'Crema', aliases: ['crema', 'panna', 'besciamella', 'fior di panna', 'crema di latte'], category: 'basi', visual: 'sauce', layer: 'sauce', density: 1, colors: ['#F3ECDD'] },
  { id: 'crema-patate', name: 'Crema di patate', aliases: ['crema di patate', 'vellutata di patate', 'pure', 'purea di patate'], category: 'basi', visual: 'sauce', layer: 'sauce', density: 1, colors: ['#EDDCA6'] },
  { id: 'crema-friarielli', name: 'Crema di friarielli', aliases: ['crema di friarielli', 'pesto di friarielli', 'crema di broccoli'], category: 'basi', visual: 'sauce', layer: 'sauce', density: 1, colors: ['#41602A'] },
  { id: 'crema-funghi', name: 'Crema di funghi', aliases: ['crema di funghi', 'crema di porcini', 'crema ai funghi'], category: 'basi', visual: 'sauce', layer: 'sauce', density: 1, colors: ['#B39371'] },
  { id: 'crema-ricotta', name: 'Crema di ricotta', aliases: ['crema di ricotta', 'ricotta in crema'], category: 'basi', visual: 'sauce', layer: 'sauce', density: 1, colors: ['#F6F0E3'] },
  { id: 'crema-peperoni', name: 'Crema di peperoni', aliases: ['crema di peperoni', 'vellutata di peperoni'], category: 'basi', visual: 'sauce', layer: 'sauce', density: 1, colors: ['#D6532C'] },
  { id: 'crema-ceci', name: 'Crema di ceci', aliases: ['crema di ceci', 'hummus', 'purea di ceci'], category: 'basi', visual: 'sauce', layer: 'sauce', density: 1, colors: ['#DDBE84'] },
  { id: 'crema-nocciole', name: 'Crema di nocciole', aliases: ['crema di nocciole', 'nutella', 'cioccolato', 'crema al cioccolato', 'crema gianduia'], category: 'basi', visual: 'sauce', layer: 'sauce', density: 1, colors: ['#5A3220'] },

  // ——— Formaggi ———
  { id: 'mozzarella', name: 'Mozzarella', aliases: ['mozzarella', 'mozzarelle', 'mozzarella fresca'], category: 'formaggi', visual: 'melted', layer: 'cheese', density: 1, colors: ['#FBF7EC', '#F0E3C2'] },
  { id: 'fior-di-latte', name: 'Fior di latte', aliases: ['fior di latte', 'fiordilatte', 'fior di latte di agerola', 'fiordilatte di agerola', 'fior di latte campano'], category: 'formaggi', visual: 'melted', layer: 'cheese', density: 1, colors: ['#FCF8EE', '#F1E5C6'] },
  { id: 'bufala', name: 'Mozzarella di bufala', aliases: ['mozzarella di bufala', 'bufala', 'bufala campana', 'mozzarella di bufala campana', 'mozzarella di bufala dop'], category: 'formaggi', visual: 'melted', layer: 'cheese', density: 1.05, colors: ['#FFFDF7', '#F3EAD3'] },
  { id: 'provola', name: 'Provola', aliases: ['provola', 'provola affumicata', 'provola di agerola', 'provolone', 'provolone del monaco'], category: 'formaggi', visual: 'melted', layer: 'cheese', density: 1, colors: ['#F2DFB4', '#D9B676'] },
  { id: 'scamorza', name: 'Scamorza', aliases: ['scamorza', 'scamorza affumicata', 'scamorza bianca'], category: 'formaggi', visual: 'melted', layer: 'cheese', density: 1, colors: ['#EFD8A6', '#C99A55'] },
  { id: 'caciocavallo', name: 'Caciocavallo', aliases: ['caciocavallo', 'caciocavallo podolico', 'caciocavallo silano'], category: 'formaggi', visual: 'melted', layer: 'cheese', density: 1, colors: ['#F0D58F', '#D4A957'] },
  { id: 'formaggio-fuso', name: 'Formaggio a pasta morbida', aliases: ['fontina', 'taleggio', 'emmental', 'asiago', 'brie', 'camembert', 'stracchino', 'crescenza', 'squacquerone'], category: 'formaggi', visual: 'melted', layer: 'cheese', density: 0.9, colors: ['#F3E2AE', '#DCC07A'] },
  { id: 'burrata', name: 'Burrata', aliases: ['burrata', 'burratina', 'burrata pugliese'], category: 'formaggi', visual: 'burrata', layer: 'finish', density: 1, colors: ['#FFFDF6', '#F2EAD8'] },
  { id: 'stracciatella', name: 'Stracciatella', aliases: ['stracciatella', 'stracciatella di burrata', 'stracciatella di bufala'], category: 'formaggi', visual: 'dollop', layer: 'finish', density: 1, colors: ['#FFFCF4', '#EFE6D2'] },
  { id: 'ricotta', name: 'Ricotta', aliases: ['ricotta', 'ricotta di bufala', 'ricotta fresca', 'ricotta vaccina'], category: 'formaggi', visual: 'dollop', layer: 'cheese', density: 1, colors: ['#FBF8F0', '#EDE6D6'] },
  { id: 'gorgonzola', name: 'Gorgonzola', aliases: ['gorgonzola', 'zola', 'gorgonzola dolce', 'gorgonzola piccante', 'erborinato', 'formaggio erborinato'], category: 'formaggi', visual: 'veined', layer: 'cheese', density: 1, colors: ['#F4EBCB', '#5E7F7A'] },
  { id: 'parmigiano', name: 'Parmigiano', aliases: ['parmigiano', 'parmigiano reggiano', 'parmigiano grattugiato', 'grana', 'grana padano', 'formaggio grattugiato', 'grattugiato'], category: 'formaggi', visual: 'grated', layer: 'finish', density: 1, colors: ['#F1DE9E', '#FAF0C8'] },
  { id: 'pecorino', name: 'Pecorino', aliases: ['pecorino', 'pecorino romano', 'pecorino sardo', 'cacio', 'cacioricotta'], category: 'formaggi', visual: 'grated', layer: 'finish', density: 0.9, colors: ['#F4EBD2', '#E3D3A6'] },
  { id: 'ricotta-salata', name: 'Ricotta salata', aliases: ['ricotta salata', 'ricotta affumicata'], category: 'formaggi', visual: 'grated', layer: 'finish', density: 0.9, colors: ['#F8F4EA', '#E9E1CF'] },
  { id: 'scaglie-grana', name: 'Scaglie di grana', aliases: ['scaglie di grana', 'scaglie di parmigiano', 'parmigiano a scaglie', 'grana a scaglie', 'scaglie di pecorino'], category: 'formaggi', visual: 'shaved', layer: 'finish', density: 1, colors: ['#EFD995', '#D3B464'] },

  // ——— Erbe e foglie ———
  { id: 'basilico', name: 'Basilico', aliases: ['basilico', 'foglie di basilico', 'basilico fresco', 'foglia di basilico', 'basilico napoletano'], category: 'erbe', visual: 'leaf', layer: 'topping', density: 1, colors: ['#2F7A34', '#4F9C3F'] },
  { id: 'rucola', name: 'Rucola', aliases: ['rucola', 'rughetta', 'rucoletta', 'rucola selvatica'], category: 'erbe', visual: 'arugula', layer: 'finish', density: 1, colors: ['#4E7F2C', '#6E9E3C'] },
  { id: 'menta', name: 'Menta', aliases: ['menta', 'mentuccia', 'foglie di menta'], category: 'erbe', visual: 'leaf', layer: 'finish', density: 0.7, colors: ['#5E9E5A', '#86C27A'] },
  { id: 'origano', name: 'Origano', aliases: ['origano', 'origano secco', 'origano di sicilia'], category: 'erbe', visual: 'specks', layer: 'finish', density: 0.8, colors: ['#5D6B2E', '#7A8740'] },
  { id: 'prezzemolo', name: 'Prezzemolo', aliases: ['prezzemolo', 'prezzemolo tritato'], category: 'erbe', visual: 'specks', layer: 'finish', density: 0.7, colors: ['#3E7A2E', '#5A9A3E'] },
  { id: 'rosmarino', name: 'Rosmarino', aliases: ['rosmarino', 'timo', 'erbe aromatiche', 'maggiorana', 'salvia'], category: 'erbe', visual: 'specks', layer: 'finish', density: 0.6, colors: ['#4C6B3C', '#6E8A5A'] },
  { id: 'radicchio', name: 'Radicchio', aliases: ['radicchio', 'radicchio rosso', 'radicchio di treviso', 'trevisana'], category: 'erbe', visual: 'arugula', layer: 'topping', density: 0.8, colors: ['#7A1F3D', '#B04A6A'] },

  // ——— Verdure ———
  { id: 'funghi', name: 'Funghi', aliases: ['funghi', 'fungo', 'champignon', 'funghi champignon', 'funghi trifolati', 'funghi freschi', 'prataioli', 'cardoncelli', 'funghi misti', 'chiodini'], category: 'verdure', visual: 'mushroom', layer: 'topping', density: 1, colors: ['#E9D6B8', '#9C7852'] },
  { id: 'porcini', name: 'Porcini', aliases: ['porcini', 'porcino', 'funghi porcini', 'fungo porcino', 'porcini trifolati', 'funghi porcini trifolati'], category: 'verdure', visual: 'mushroom', layer: 'topping', density: 0.85, colors: ['#EEDCBA', '#6E4220'] },
  { id: 'friarielli', name: 'Friarielli', aliases: ['friarielli', 'friariello', 'broccoli di rapa', 'cime di rapa', 'broccoletti', 'broccoli'], category: 'verdure', visual: 'greens', layer: 'topping', density: 1, colors: ['#2E4D1E', '#4A6E2B'] },
  { id: 'scarola', name: 'Scarola', aliases: ['scarola', 'scarola stufata', 'indivia', 'scarola riccia'], category: 'verdure', visual: 'greens', layer: 'topping', density: 1, colors: ['#5C7A2E', '#8BA14A'] },
  { id: 'spinaci', name: 'Spinaci', aliases: ['spinaci', 'spinacino', 'spinaci saltati', 'bietole', 'cicoria', 'erbette'], category: 'verdure', visual: 'greens', layer: 'topping', density: 1, colors: ['#244A1E', '#3A6328'] },
  { id: 'zucca', name: 'Zucca', aliases: ['zucca', 'zucca a cubetti', 'zucca arrosto', 'cubetti di zucca', 'zucca al forno', 'zucca mantovana'], category: 'verdure', visual: 'cube', layer: 'topping', density: 1, colors: ['#E8892B', '#B65F1D'] },
  { id: 'melanzane', name: 'Melanzane', aliases: ['melanzane', 'melanzana', 'melanzane fritte', 'melanzane grigliate', 'melanzane a funghetto', 'parmigiana'], category: 'verdure', visual: 'eggplant', layer: 'topping', density: 1, colors: ['#3F1D3A', '#D8B36E'] },
  { id: 'zucchine', name: 'Zucchine', aliases: ['zucchine', 'zucchina', 'zucchine grigliate', 'zucchine trifolate', 'zucchine alla scapece', 'scapece'], category: 'verdure', visual: 'veg-slice', layer: 'topping', density: 1, colors: ['#3F7A2E', '#E5E3A9'] },
  { id: 'peperoni', name: 'Peperoni', aliases: ['peperoni', 'peperone', 'peperoni arrosto', 'peperoni rossi', 'peperoni gialli', 'peperonata', 'papaccelle', 'friggitelli', 'peperoni cruschi'], category: 'verdure', visual: 'strip', layer: 'topping', density: 1, colors: ['#C8321F', '#F2B526'] },
  { id: 'cipolla', name: 'Cipolla', aliases: ['cipolla', 'cipolle', 'cipolla rossa', 'cipolla di tropea', 'cipollotto', 'cipolla caramellata', 'cipolle caramellate', 'scalogno'], category: 'verdure', visual: 'onion', layer: 'topping', density: 1, colors: ['#9A3D6A', '#C774A0'] },
  { id: 'cipolla-croccante', name: 'Cipolla croccante', aliases: ['cipolla croccante', 'cipolle croccanti', 'cipolla fritta', 'cipolle fritte', 'cipolla crispy'], category: 'verdure', visual: 'crumble', layer: 'finish', density: 0.9, colors: ['#B87A33', '#8E5420'] },
  { id: 'patate', name: 'Patate', aliases: ['patate', 'patata', 'patate al forno', 'patate a fette', 'patate lesse', 'patate a rondelle', 'patate novelle'], category: 'verdure', visual: 'potato', layer: 'topping', density: 1, colors: ['#F0DB9C', '#C68E3F'] },
  { id: 'patatine', name: 'Patatine fritte', aliases: ['patatine', 'patatine fritte', 'patate fritte', 'chips', 'patatine a bastoncino'], category: 'verdure', visual: 'fries', layer: 'finish', density: 1, colors: ['#F0C75A', '#C98F2E'] },
  { id: 'pomodorini', name: 'Pomodorini', aliases: ['pomodorini', 'pomodorino', 'pomodorini rossi', 'datterini', 'datterino', 'ciliegini', 'pomodorini del piennolo', 'piennolo', 'pomodorini confit', 'pomodorini al forno', 'pachino'], category: 'verdure', visual: 'cherry-tomato', layer: 'topping', density: 1, colors: ['#D3301C', '#EE5B3B'] },
  { id: 'pomodorini-gialli', name: 'Pomodorini gialli', aliases: ['pomodorini gialli', 'datterini gialli', 'pomodorino giallo', 'piennolo giallo', 'pomodoro giallo'], category: 'verdure', visual: 'cherry-tomato', layer: 'topping', density: 1, colors: ['#F0B21E', '#F7CF55'] },
  { id: 'pomodoro-fresco', name: 'Pomodoro fresco', aliases: ['pomodoro fresco', 'pomodori freschi', 'fette di pomodoro', 'pomodoro a fette', 'cuore di bue', 'pomodoro cuore di bue', 'pomodoro crudo'], category: 'verdure', visual: 'tomato-slice', layer: 'finish', density: 1, colors: ['#D23C27', '#EA6A47'] },
  { id: 'pomodori-secchi', name: 'Pomodori secchi', aliases: ['pomodori secchi', 'pomodoro secco', 'pomodori secchi sott olio'], category: 'verdure', visual: 'strip', layer: 'topping', density: 0.8, colors: ['#8E2A1C', '#A8402A'] },
  { id: 'carciofi', name: 'Carciofi', aliases: ['carciofi', 'carciofo', 'carciofini', 'carciofi alla romana', 'cuori di carciofo'], category: 'verdure', visual: 'artichoke', layer: 'topping', density: 1, colors: ['#A7A55E', '#7B4C6C'] },
  { id: 'fiori-zucca', name: 'Fiori di zucca', aliases: ['fiori di zucca', 'fiori di zucchina', 'fiore di zucca', 'fiori di zucchine'], category: 'verdure', visual: 'flower', layer: 'finish', density: 1, colors: ['#F2A023', '#F7C548'] },
  { id: 'asparagi', name: 'Asparagi', aliases: ['asparagi', 'asparago', 'punte di asparagi'], category: 'verdure', visual: 'strip', layer: 'topping', density: 0.9, colors: ['#6E9A3A', '#8DB24E'] },
  { id: 'mais', name: 'Mais', aliases: ['mais', 'granturco', 'pannocchia'], category: 'verdure', visual: 'kernels', layer: 'topping', density: 1, colors: ['#F3C33C', '#E2A92A'] },
  { id: 'aglio', name: 'Aglio', aliases: ['aglio', 'aglio a fettine', 'spicchi d aglio', 'aglio fresco', 'aglio rosso'], category: 'verdure', visual: 'kernels', layer: 'topping', density: 0.6, colors: ['#F2EBD7', '#D9CBA8'] },
  { id: 'olive-nere', name: 'Olive nere', aliases: ['olive', 'oliva', 'olive nere', 'olive di gaeta', 'olive taggiasche', 'olive denocciolate', 'olive caiazzane'], category: 'verdure', visual: 'olive', layer: 'topping', density: 1, colors: ['#2B2420', '#4A3B33'] },
  { id: 'olive-verdi', name: 'Olive verdi', aliases: ['olive verdi', 'oliva verde', 'olive castelvetrano'], category: 'verdure', visual: 'olive', layer: 'topping', density: 1, colors: ['#7F8B38', '#A3AD55'] },
  { id: 'capperi', name: 'Capperi', aliases: ['capperi', 'cappero', 'capperi di salina', 'capperi di pantelleria'], category: 'verdure', visual: 'balls', layer: 'topping', density: 1, colors: ['#6F8237', '#8FA04D'] },
  { id: 'tartufo', name: 'Tartufo', aliases: ['tartufo', 'tartufo nero', 'scaglie di tartufo', 'crema di tartufo', 'tartufo estivo'], category: 'verdure', visual: 'shaved', layer: 'finish', density: 0.8, colors: ['#4A3A2E', '#2E241C'] },

  // ——— Salumi e carne ———
  { id: 'salsiccia', name: 'Salsiccia', aliases: ['salsiccia', 'salsicce', 'salsiccia sbriciolata', 'salsiccia di maiale', 'punta di coltello', 'salsiccia fresca', 'luganega'], category: 'salumi', visual: 'crumble', layer: 'topping', density: 1, colors: ['#9A5B3D', '#5E3320'] },
  { id: 'salame', name: 'Salame', aliases: ['salame', 'salamino', 'salame piccante', 'salame napoletano', 'spianata', 'spianata calabra', 'pepperoni', 'diavola', 'salamino piccante', 'ventricina'], category: 'salumi', visual: 'salami', layer: 'topping', density: 1, colors: ['#B6353A', '#8A2228'] },
  { id: 'nduja', name: "'Nduja", aliases: ['nduja', 'n duja', 'nduja di spilinga', 'salame spalmabile'], category: 'salumi', visual: 'dollop', layer: 'topping', density: 0.9, colors: ['#C8401F', '#E36A33'] },
  { id: 'prosciutto', name: 'Prosciutto crudo', aliases: ['prosciutto', 'prosciutto crudo', 'crudo', 'crudo di parma', 'prosciutto di parma', 'san daniele', 'prosciutto san daniele', 'jamon'], category: 'salumi', visual: 'drape', layer: 'finish', density: 1, colors: ['#D8706B', '#F4DCD3'] },
  { id: 'prosciutto-cotto', name: 'Prosciutto cotto', aliases: ['prosciutto cotto', 'cotto', 'cotto alla brace'], category: 'salumi', visual: 'folded', layer: 'topping', density: 1, colors: ['#EDB4A3', '#F7D9CE'] },
  { id: 'mortadella', name: 'Mortadella', aliases: ['mortadella', 'mortadella di bologna', 'mortadella igp'], category: 'salumi', visual: 'folded', layer: 'finish', density: 1, colors: ['#F0A9A4', '#FBE8E3'] },
  { id: 'pancetta', name: 'Pancetta', aliases: ['pancetta', 'pancetta tesa', 'pancetta arrotolata', 'pancetta affumicata', 'bacon', 'pancetta croccante'], category: 'salumi', visual: 'ribbon', layer: 'topping', density: 0.9, colors: ['#D9837A', '#F6E3D6'] },
  { id: 'guanciale', name: 'Guanciale', aliases: ['guanciale', 'guanciale croccante', 'cubetti di pancetta', 'pancetta a cubetti', 'lardo'], category: 'salumi', visual: 'cube', layer: 'topping', density: 1, colors: ['#E2A28E', '#F7E6DA'] },
  { id: 'speck', name: 'Speck', aliases: ['speck', 'speck alto adige', 'capocollo', 'coppa', 'lonza'], category: 'salumi', visual: 'drape', layer: 'finish', density: 1, colors: ['#A33F3A', '#EBC9C0'] },
  { id: 'bresaola', name: 'Bresaola', aliases: ['bresaola', 'bresaola della valtellina', 'carne salada'], category: 'salumi', visual: 'drape', layer: 'finish', density: 1, colors: ['#8E2B2E', '#B65055'] },
  { id: 'wurstel', name: 'Würstel', aliases: ['wurstel', 'wuerstel', 'wurstel di pollo', 'hot dog', 'frankfurter'], category: 'salumi', visual: 'wurstel', layer: 'topping', density: 1, colors: ['#D9897A', '#B4604F'] },
  { id: 'cicoli', name: 'Cicoli', aliases: ['cicoli', 'ciccioli', 'sfrizzoli'], category: 'salumi', visual: 'crumble', layer: 'topping', density: 0.8, colors: ['#C79A6B', '#8F6237'] },
  { id: 'pollo', name: 'Pollo', aliases: ['pollo', 'petto di pollo', 'pollo grigliato', 'tacchino'], category: 'salumi', visual: 'crumble', layer: 'topping', density: 0.8, colors: ['#E8C9A0', '#B98D5E'] },

  // ——— Pesce ———
  { id: 'acciughe', name: 'Acciughe', aliases: ['acciughe', 'acciuga', 'alici', 'alice', 'alici di cetara', 'colatura', 'colatura di alici', 'colatura di alici di cetara', 'alici marinate'], category: 'mare', visual: 'fillet', layer: 'finish', density: 1, colors: ['#7A5A43', '#C6C2B8'] },
  { id: 'tonno', name: 'Tonno', aliases: ['tonno', 'tonno sott olio', 'tonno in scatola', 'ventresca', 'ventresca di tonno'], category: 'mare', visual: 'crumble', layer: 'topping', density: 0.9, colors: ['#C9A08A', '#9E7560'] },
  { id: 'salmone', name: 'Salmone', aliases: ['salmone', 'salmone affumicato', 'salmone marinato'], category: 'mare', visual: 'drape', layer: 'finish', density: 1, colors: ['#F08A5D', '#F8C1A2'] },
  { id: 'gamberi', name: 'Gamberi', aliases: ['gamberi', 'gamberetti', 'gambero', 'mazzancolle'], category: 'mare', visual: 'crumble', layer: 'topping', density: 0.8, colors: ['#F29A7A', '#D4694A'] },

  // ——— Frutta secca e semi ———
  { id: 'pistacchio', name: 'Pistacchio', aliases: ['pistacchio', 'pistacchi', 'granella di pistacchio', 'granella di pistacchi', 'pistacchio di bronte'], category: 'croccanti', visual: 'granella', layer: 'finish', density: 1, colors: ['#8CB04A', '#6E8F35', '#7E5A6E'] },
  { id: 'nocciole', name: 'Nocciole', aliases: ['nocciole', 'nocciola', 'granella di nocciole', 'nocciole tostate', 'nocciole di giffoni'], category: 'croccanti', visual: 'granella', layer: 'finish', density: 0.9, colors: ['#B98349', '#8A5A2E'] },
  { id: 'noci', name: 'Noci', aliases: ['noci', 'noce', 'gherigli di noce', 'noci tritate'], category: 'croccanti', visual: 'granella', layer: 'finish', density: 0.8, colors: ['#8B5E34', '#A9774A'] },
  { id: 'mandorle', name: 'Mandorle', aliases: ['mandorle', 'mandorla', 'mandorle a lamelle', 'lamelle di mandorle'], category: 'croccanti', visual: 'shaved', layer: 'finish', density: 0.9, colors: ['#F1DFC0', '#D4B27F'] },
  { id: 'pinoli', name: 'Pinoli', aliases: ['pinoli', 'pinolo', 'pinoli tostati'], category: 'croccanti', visual: 'kernels', layer: 'finish', density: 1, colors: ['#EADBB5', '#D6C08E'] },
  { id: 'semi', name: 'Semi', aliases: ['semi', 'semi misti', 'semi di sesamo', 'sesamo', 'semi di girasole', 'semi di zucca', 'semi di papavero', 'papavero', 'semi di lino', 'semi di chia'], category: 'croccanti', visual: 'seeds', layer: 'finish', density: 1, colors: ['#EFE2C2', '#2E2A36'] },
  { id: 'pangrattato', name: 'Pangrattato', aliases: ['pangrattato', 'pane croccante', 'mollica', 'mollica tostata', 'briciole di pane', 'taralli', 'tarallo sbriciolato', 'crumble'], category: 'croccanti', visual: 'granella', layer: 'finish', density: 1, colors: ['#D9A85E', '#B8823C'] },

  // ——— Condimenti ———
  { id: 'olio', name: 'Olio', aliases: ['olio', 'olio evo', 'olio extravergine', 'olio extra vergine', 'olio extravergine di oliva', 'olio di oliva', 'olio d oliva', 'filo d olio', 'un filo d olio', 'olio a crudo'], category: 'condimenti', visual: 'drizzle', layer: 'finish', density: 1, colors: ['#C9A43B'] },
  { id: 'pepe', name: 'Pepe', aliases: ['pepe', 'pepe nero', 'pepe macinato', 'pepe bianco', 'pepe rosa'], category: 'condimenti', visual: 'specks', layer: 'finish', density: 1, colors: ['#2B241F', '#4A3F36'] },
  { id: 'peperoncino', name: 'Peperoncino', aliases: ['peperoncino', 'peperoncini', 'peperoncino piccante', 'peperoncino fresco', 'chili', 'olio piccante', 'olio al peperoncino', 'peperoncino calabrese'], category: 'condimenti', visual: 'specks', layer: 'finish', density: 0.6, colors: ['#C8361B', '#E06A2A'] },
  { id: 'miele', name: 'Miele', aliases: ['miele', 'miele di castagno', 'miele millefiori', 'miele piccante', 'hot honey', 'miele d acacia'], category: 'condimenti', visual: 'drizzle', layer: 'finish', density: 1, colors: ['#D9962B'] },
  { id: 'balsamico', name: 'Glassa balsamica', aliases: ['aceto balsamico', 'glassa di aceto balsamico', 'glassa balsamica', 'balsamico', 'riduzione di balsamico'], category: 'condimenti', visual: 'drizzle', layer: 'finish', density: 0.8, colors: ['#3B1E1A'] },
  { id: 'sale', name: 'Sale', aliases: ['sale', 'sale grosso', 'fior di sale', 'sale maldon', 'sale in fiocchi'], category: 'condimenti', visual: 'specks', layer: 'finish', density: 0.4, colors: ['#FFFFFF', '#EDE8E0'] },
  { id: 'limone', name: 'Limone', aliases: ['limone', 'scorza di limone', 'limone di sorrento', 'limone di amalfi', 'zeste di limone', 'buccia di limone'], category: 'condimenti', visual: 'onion', layer: 'finish', density: 0.5, colors: ['#F2D33A', '#F7E37A'] },

  // ——— Frutta ———
  { id: 'fichi', name: 'Fichi', aliases: ['fichi', 'fico', 'fichi freschi', 'fichi caramellati', 'fichi secchi'], category: 'frutta', visual: 'fig', layer: 'finish', density: 1, colors: ['#5E2C4A', '#C9485B'] },
  { id: 'uvetta', name: 'Uvetta', aliases: ['uvetta', 'uva passa', 'uva sultanina', 'uva'], category: 'frutta', visual: 'balls', layer: 'topping', density: 0.8, colors: ['#4A2C2A', '#6B3F35'] },
  { id: 'pere', name: 'Pere', aliases: ['pere', 'pera', 'pera williams', 'mele', 'mela'], category: 'frutta', visual: 'veg-slice', layer: 'finish', density: 0.8, colors: ['#C9C46A', '#F3EFCF'] },
];
