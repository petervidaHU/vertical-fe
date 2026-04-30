export function mapStoryDtoToDomain(dto) {
    return {
        id: dto.id,
        title: dto.title,
        epicTitle: dto.epicTitle ?? "",
        isPassed: Boolean(dto.passed),
    };
}
export function mapStoriesDtoToDomain(dtos) {
    return dtos.map(mapStoryDtoToDomain);
}
