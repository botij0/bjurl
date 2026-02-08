export class CreateUrlDto {
  private constructor(public readonly long_url: string) {}

  static create(props: { [key: string]: any }): [string?, CreateUrlDto?] {
    const { longUrl } = props;

    if (!longUrl) return ["Long Url is required", undefined];

    return [undefined, new CreateUrlDto(longUrl)];
  }
}
