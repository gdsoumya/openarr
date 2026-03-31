import { TMDBClient } from './client';
import { TMDB_READ_ACCESS_TOKEN } from '../../core/config';
export const tmdb = new TMDBClient(TMDB_READ_ACCESS_TOKEN);
