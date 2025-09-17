// app/slug_cache.go
package app

import (
	"context"
	"sync"
	"sync/atomic"
)

type SlugCache struct {
	mu     sync.RWMutex
	animal map[string]int
	subcat map[string]int
	typ    map[string]int
	ver    atomic.Int64
}

func NewSlugCache() *SlugCache {
	return &SlugCache{
		animal: map[string]int{},
		subcat: map[string]int{},
		typ:    map[string]int{},
	}
}

func (c *SlugCache) Reload(ctx context.Context) error {
	// SELECT Slug, ID FROM ... を読み込み、c.* を差し替え（前回答の loadMap を利用）
	return nil
}

// 読み取りAPI（AnimalID/SubCategoryIDなど）・Upsert系もここに
// 追加直後にポイント差し込み（フルリロード不要なとき）
func (c *SlugCache) UpsertAnimal(slug string, id int) {
	c.mu.Lock()
	c.animal[slug] = id
	c.mu.Unlock()
}
func (c *SlugCache) UpsertSubCategory(slug string, id int) {
	c.mu.Lock()
	c.subcat[slug] = id
	c.mu.Unlock()
}
func (c *SlugCache) UpsertType(slug string, id int) {
	c.mu.Lock()
	c.typ[slug] = id
	c.mu.Unlock()
}

// 参照（読み取りはRLock）
func (c *SlugCache) AnimalID(slug string) (int, bool) {
	c.mu.RLock()
	id, ok := c.animal[slug]
	c.mu.RUnlock()
	return id, ok
}
func (c *SlugCache) SubCategoryID(slug string) (int, bool) {
	c.mu.RLock()
	id, ok := c.subcat[slug]
	c.mu.RUnlock()
	return id, ok
}
func (c *SlugCache) TypeID(slug string) (int, bool) {
	c.mu.RLock()
	id, ok := c.typ[slug]
	c.mu.RUnlock()
	return id, ok
}
