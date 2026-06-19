/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // self-hosted за nginx, без serverless. Картинки скрапера/скриншоты обслуживаются отдельно.
  // @resvg/resvg-js — нативный бинарь, не бандлить webpack'ом (OG-карточка).
  serverExternalPackages: ["@resvg/resvg-js"],
};

export default nextConfig;
