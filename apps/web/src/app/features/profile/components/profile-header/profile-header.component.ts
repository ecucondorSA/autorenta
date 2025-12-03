import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { UserProfile, UserStats } from '../../../../core/models';

@Component({
  standalone: true,
  selector: 'app-profile-header',
  imports: [CommonModule],
  templateUrl: './profile-header.component.html',
  styleUrls: ['./profile-header.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileHeaderComponent {
  profile = input.required<UserProfile | null>();
  avatarUrl = input.required<string | null>();
  userEmail = input.required<string>();
  userStats = input<UserStats | null>(null);
  uploadingAvatar = input<boolean>(false);
  availableBalance = input<number>(0);

  avatarChange = output<Event>();
  deleteAvatar = output<void>();
  editProfile = output<void>();
  uploadDocuments = output<void>();
  signOut = output<void>();

  readonly averageRating = computed((): number => {
    const stats = this.userStats();
    if (!stats) return 0;
    const ownerRating = stats.owner_rating_avg || 0;
    const renterRating = stats.renter_rating_avg || 0;
    if (ownerRating && renterRating) {
      return Number(((ownerRating + renterRating) / 2).toFixed(1));
    }
    return ownerRating || renterRating || 0;
  });

  readonly verificationStatus = computed(() => {
    const p = this.profile();
    if (!p) return { verified: false, level: 'none' };
    const checks = [p.email_verified, p.phone_verified, p.id_verified].filter(
      Boolean,
    ).length;
    return {
      verified: checks >= 2,
      level: checks === 3 ? 'full' : checks === 2 ? 'partial' : 'none',
    };
  });

  readonly roleLabel = computed(() => {
    const role = this.profile()?.role;
    if (role === 'owner') return 'Locador';
    if (role === 'renter') return 'Locatario';
    if (role === 'both') return 'Ambos';
    return 'Administrador';
  });
}
