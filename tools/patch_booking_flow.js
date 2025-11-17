const fs = require('fs');
const p = 'src/app/core/services/booking-flow.service.ts';
let s = fs.readFileSync(p, 'utf8');
// Fix import
s = s.replace(/import \{ getErrorMessage \} from '\.\.\/utils\/error-handler';/, "import { getErrorMessage } from '../utils/type-guards';");
// Replace currentUser id access
s = s.replace(/this\.authService\.currentUser\(\)\?\.id/g, 'this.authService.session$()? .user?.id'.replace('? .','()?'));

// Replace navigateToNextStep body
const fnHeader = 'async navigateToNextStep(booking: Booking): Promise<void> {';
const fnStart = s.indexOf(fnHeader);
if (fnStart !== -1) {
  const after = s.slice(fnStart);
  let depth = 0;
  let idx = 0;
  for (idx = 0; idx < after.length; idx++) {
    const ch = after[idx];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  const fnBody = after.slice(0, idx + 1);
  const replacement = `async navigateToNextStep(booking: Booking): Promise<void> {
    // Prefer synchronous session; fall back to async call to ensure session is restored
    const session = this.authService.session$();
    let currentUserId = session?.user?.id;
    if (!currentUserId) {
      const currentUser = await this.authService.getCurrentUser();
      if (!currentUser) {
        await this.router.navigate(["/auth/login"]);
        return;
      }
      currentUserId = currentUser.id;
    }

    const userRole = this.getUserRole(booking, currentUserId);
    const nextStep = this.getNextStep(booking, userRole);
    if (nextStep) {
      await this.router.navigate([nextStep.route]);
    } else {
      // Fallback: go to booking detail
      await this.router.navigate(['/bookings', booking.id]);
    }
  }`;
  s = s.slice(0, fnStart) + replacement + s.slice(fnStart + fnBody.length);
}

fs.writeFileSync(p, s, 'utf8');
console.log('patched booking-flow.service.ts');
