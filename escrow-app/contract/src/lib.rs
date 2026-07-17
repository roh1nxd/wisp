#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Buyer,
    Seller,
    Token,
    Amount,
    IsReleased,
    IsInitialized,
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    pub fn initialize(env: Env, buyer: Address, seller: Address, token: Address, amount: i128) {
        if env.storage().instance().has(&DataKey::IsInitialized) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Buyer, &buyer);
        env.storage().instance().set(&DataKey::Seller, &seller);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Amount, &amount);
        env.storage().instance().set(&DataKey::IsReleased, &false);
        env.storage().instance().set(&DataKey::IsInitialized, &true);
    }

    pub fn release(env: Env) {
        let is_released: bool = env.storage().instance().get(&DataKey::IsReleased).unwrap_or(false);
        if is_released {
            panic!("funds already released");
        }

        let buyer: Address = env.storage().instance().get(&DataKey::Buyer).unwrap();
        
        // Access Control: caller must be the buyer
        buyer.require_auth();

        let seller: Address = env.storage().instance().get(&DataKey::Seller).unwrap();
        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let amount: i128 = env.storage().instance().get(&DataKey::Amount).unwrap();

        // Perform token transfer from contract's balance to the seller
        let client = token::Client::new(&env, &token_addr);
        let contract_address = env.current_contract_address();
        
        client.transfer(&contract_address, &seller, &amount);

        env.storage().instance().set(&DataKey::IsReleased, &true);
    }
}

mod test;
