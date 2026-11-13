module.exports = {
  title: 'Dragonfly test site',
  author: 'Test author',
  url: 'https://example.test',
  root: '/',
  theme: 'butterfly',
  language: 'en',
  permalink: 'article/:title/',
  search: { path: 'search.xml', field: 'all', content: true },
  theme_config: {
    avatar: { img: '/img/favicon.ico' },
    error_404: { enable: true },
    menu: { Home: '/', Tags: '/tags/', About: '/about/' },
    CDN: { internal_provider: 'local', third_party_provider: 'jsdelivr' }
  }
}
