package handler

import (
	"animaloop/function"
	"animaloop/utils"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
)

type AnimalDetailsRequest struct {
	Animal *utils.AnimalDetails `json:"animal"`
}

func (h *FleaMarketHandler) UpsertAnimalDetails(w http.ResponseWriter, r *http.Request) {
	uid, err := function.CheckUser(h.db, w, r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	itemIDStr := vars["id"]
	itemID, err := strconv.ParseUint(itemIDStr, 10, 64)
	if err != nil {
		http.Error(w, "invalid item id", http.StatusBadRequest)
		return
	}

	log.Printf("[animal_details] uid=%s itemID=%d", uid, itemID)

	// 出品者チェック（他人の出品は触らせない）
	ownerID, err := h.db.FindFleaItemOwnerID(r.Context(), itemID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			log.Printf("[animal_details] item not found: id=%d", itemID)
			http.Error(w, "not found", http.StatusNotFound)
		} else {
			log.Printf("[animal_details] FindFleaItemOwnerID error: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
		}
		return
	}

	if ownerID != uid {
		log.Printf("[animal_details] forbidden: uid=%s ownerID=%s itemID=%d", uid, ownerID, itemID)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	var req AnimalDetailsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	if err := h.db.UpsertAnimalDetails(ctx, itemID, req.Animal); err != nil {
		log.Printf("[animal_details.upsert] item=%d err=%v", itemID, err)
		http.Error(w, "failed to save details", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

type SupplyDetailsRequest struct {
	Supply *utils.SupplyDetails `json:"supply"`
}

func (h *FleaMarketHandler) UpsertSupplyDetails(w http.ResponseWriter, r *http.Request) {
	uid, err := function.CheckUser(h.db, w, r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	itemIDStr := vars["id"]
	itemID, err := strconv.ParseUint(itemIDStr, 10, 64)
	if err != nil {
		http.Error(w, "invalid item id", http.StatusBadRequest)
		return
	}

	log.Printf("[supply_details] uid=%s itemID=%d", uid, itemID)

	// 出品者チェック
	ownerID, err := h.db.FindFleaItemOwnerID(r.Context(), itemID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			log.Printf("[supply_details] item not found: id=%d", itemID)
			http.Error(w, "not found", http.StatusNotFound)
		} else {
			log.Printf("[supply_details] FindFleaItemOwnerID error: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
		}
		return
	}
	if ownerID != uid {
		log.Printf("[supply_details] forbidden: uid=%s ownerID=%s itemID=%d", uid, ownerID, itemID)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	var req SupplyDetailsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	if err := h.db.UpsertSupplyDetails(ctx, itemID, req.Supply); err != nil {
		log.Printf("[supply_details.upsert] item=%d err=%v", itemID, err)
		http.Error(w, "failed to save details", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
