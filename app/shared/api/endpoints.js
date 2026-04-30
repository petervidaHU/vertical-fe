import { apiRequest } from "./client";
export function getStories() {
    return apiRequest({
        path: "/stories",
        method: "GET",
    });
}
export function getStoryById(id) {
    return apiRequest({
        path: `/stories/${id}`,
        method: "GET",
    });
}
export function createStory(payload) {
    return apiRequest({
        path: "/stories",
        method: "POST",
        body: JSON.stringify(payload),
    });
}
export function updateStory(payload) {
    return apiRequest({
        path: `/stories/${payload.id}`,
        method: "PUT",
        body: JSON.stringify({
            title: payload.title,
            epicTitle: payload.epicTitle,
        }),
    });
}
// ── Timeline endpoints ────────────────────────────────────────────────────
export function prefetchTimeline(altitude) {
    return apiRequest({
        path: `/story/pre/${altitude}`,
        method: "GET",
    });
}
export function getTimelineProgress() {
    return apiRequest({
        path: "/story/timeline",
        method: "GET",
    });
}
