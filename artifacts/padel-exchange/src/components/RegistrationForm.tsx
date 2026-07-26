import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSubmitRegistration } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ── Padel level descriptions shown in the info popover ────────────────────────
const padelLevelDescriptions: Record<string, { emoji: string; description: string }> = {
  "Never played": {
    emoji: "🎾",
    description: "You've never picked up a padel racket — or only tried it once or twice. No worries at all; our Americano format pairs all levels together and everyone learns fast.",
  },
  "Beginner": {
    emoji: "🟢",
    description: "You've played a handful of times and understand the basics — serving, scoring, and using the glass walls. You're still building consistency but you're keen to play more.",
  },
  "Intermediate": {
    emoji: "🟡",
    description: "You play regularly (at least monthly) and are comfortable with rallies, lobs, and basic wall play. You've got your own racket and know your way around the court.",
  },
  "Advanced": {
    emoji: "🔴",
    description: "You play competitively or train regularly. You're confident with bandeja, vibora, and tactical wall play. You may have entered tournaments or play at club level.",
  },
};

// Using the exact enums expected by the API
const IndustryEnum = z.enum([
  "Technology",
  "Financial Services",
  "Professional Services",
  "Cyber / Security",
  "Legal",
  "Consulting",
  "Healthcare",
  "Other",
]);

const FunctionEnum = z.enum([
  "Founder / CEO",
  "Risk / Compliance / GRC",
  "Security / CISO",
  "Product / Engineering",
  "Sales / Marketing",
  "Operations",
  "Investor",
  "Other",
]);

const SeniorityEnum = z.enum([
  "Founder / Owner",
  "C-suite",
  "VP / Head of",
  "Director / Manager",
  "Other",
]);

const PadelLevelEnum = z.enum([
  "Never played",
  "Beginner",
  "Intermediate",
  "Advanced",
]);

const InterestsEnum = z.enum([
  "Playing / fitness",
  "Meeting other founders",
  "Industry peers & ideas",
  "Just trying padel",
  "Social play (Americano events)",
]);

const formSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Please enter a valid email address"),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  industry: IndustryEnum.optional(),
  function: FunctionEnum.optional(),
  seniority: SeniorityEnum.optional(),
  padelLevel: PadelLevelEnum.optional(),
  interests: z.array(InterestsEnum).default([]).optional(),
  linkedinUrl: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  gdprConsent: z.boolean().refine((val) => val === true, {
    message: "You must agree to the privacy policy.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export function RegistrationForm() {
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  
  const submitMutation = useSubmitRegistration();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      company: "",
      jobTitle: "",
      linkedinUrl: "",
      interests: [],
      gdprConsent: false,
    },
  });

  const onSubmit = (data: FormValues) => {
    // Transform empty strings to undefined for optional fields
    const payload = {
      ...data,
      company: data.company || undefined,
      jobTitle: data.jobTitle || undefined,
      linkedinUrl: data.linkedinUrl || undefined,
    };

    submitMutation.mutate(
      { data: payload },
      {
        onSuccess: () => {
          setIsSuccess(true);
          toast({
            title: "Application received.",
            description: "We'll be in touch with the next event.",
          });
        },
        onError: (error) => {
          const errorMessage = error?.error || "Something went wrong. Please try again.";
          toast({
            variant: "destructive",
            title: "Application failed",
            description: errorMessage,
          });
        },
      }
    );
  };

  if (isSuccess) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-lg" data-testid="registration-success">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <div className="h-8 w-8 rounded-full bg-primary" />
        </div>
        <h3 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
          You're on the list &mdash; welcome.
        </h3>
        <p className="text-muted-foreground">
          We'll be in touch with details about the next event. Keep an eye on your inbox.
        </p>
      </div>
    );
  }

  const interestsList = [
    "Playing / fitness",
    "Meeting other founders",
    "Industry peers & ideas",
    "Just trying padel",
    "Social play (Americano events)",
  ] as const;

  return (
    <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-8 md:p-10 shadow-xl backdrop-blur-sm">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" data-testid="registration-form">
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Full name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Doe" className="bg-background" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="jane@company.com" className="bg-background" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Company</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corp" className="bg-background" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="jobTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Role / Job Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Founder" className="bg-background" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Industry</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {IndustryEnum.options.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="function"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Function</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FunctionEnum.options.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="seniority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Seniority</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SeniorityEnum.options.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="padelLevel"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FormLabel className="text-foreground">Padel Level</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="What do the padel levels mean?"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0 overflow-hidden" align="start">
                        <div className="bg-card border-b border-border px-4 py-3">
                          <p className="text-sm font-semibold text-foreground">What level am I?</p>
                          <p className="text-xs text-muted-foreground mt-0.5">All levels are welcome — this helps us balance teams.</p>
                        </div>
                        <div className="divide-y divide-border">
                          {PadelLevelEnum.options.map((level) => {
                            const info = padelLevelDescriptions[level];
                            return (
                              <div key={level} className="px-4 py-3 flex gap-3">
                                <span className="text-lg leading-none mt-0.5 flex-shrink-0">{info.emoji}</span>
                                <div>
                                  <p className="text-sm font-semibold text-foreground">{level}</p>
                                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{info.description}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-2 md:grid-cols-4 gap-4"
                    >
                      {PadelLevelEnum.options.map((level) => (
                        <FormItem key={level} className="flex items-center space-x-3 space-y-0 rounded-md border border-border p-3 hover:bg-muted/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                          <FormControl>
                            <RadioGroupItem value={level} />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer w-full text-sm">
                            {level}
                          </FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="interests"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-foreground">What brings you here?</FormLabel>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {interestsList.map((item) => (
                      <FormField
                        key={item}
                        control={form.control}
                        name="interests"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={item}
                              className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border p-4 hover:bg-muted/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    return checked
                                      ? field.onChange([...current, item])
                                      : field.onChange(
                                          current.filter((value) => value !== item)
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer w-full">
                                {item}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="linkedinUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">LinkedIn Profile</FormLabel>
                <FormControl>
                  <Input placeholder="https://linkedin.com/in/..." className="bg-background" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="pt-4 pb-2 border-t border-border">
            <FormField
              control={form.control}
              name="gdprConsent"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 bg-muted/30 rounded-lg">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer text-sm font-medium text-foreground">
                      I consent to Dev AI Ltd (operating P³) processing my personal data to match me to events and send me community updates. I understand I can withdraw consent at any time by emailing{" "}
                      <a href="mailto:info@padelcubed.co.uk" className="text-primary underline underline-offset-2">info@padelcubed.co.uk</a>.
                      We will never sell your data. Read our{" "}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Privacy Policy</a>. *
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          </div>

          <Button 
            type="submit" 
            size="lg" 
            className="w-full md:w-auto rounded-full px-12 text-base font-semibold"
            disabled={submitMutation.isPending}
            data-testid="button-submit-registration"
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Registering...
              </>
            ) : (
              "Submit Application"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
