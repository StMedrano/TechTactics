import { apiRequest } from './apiClient'

export const publicService = {
  async getPublishedReviews() {
    return apiRequest('/reviews/public')
  },
}
