import { Injectable, signal } from '@angular/core';
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user = signal<User | null>(null);
  session = signal<Session | null>(null);

  constructor(private supabaseService: SupabaseService) {
    this.initAuth();
  }

  private async initAuth() {
    try {
      const { data } = await this.supabaseService.supabase.auth.getSession();
      const session = data?.session ?? null;
      this.session.set(session);
      this.user.set(session?.user ?? null);

      this.supabaseService.supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
        this.session.set(session);
        this.user.set(session?.user ?? null);
      });
    } catch (e) {
      console.warn('Auth initialization skipped in offline mode', e);
    }
  }

  async signInWithEmail(email: string) {
    return await this.supabaseService.supabase.auth.signInWithOtp({ email });
  }

  async signOut() {
    return await this.supabaseService.supabase.auth.signOut();
  }
}
